import { NextResponse } from "next/server";
import { getPositionAccounting } from "@/lib/positionAccounting";
import { calculateBrokerFee, calculateEtfSellTax } from "@/lib/trading";
import { connectToDatabase } from "@/lib/mongodb";
import { ExposureRecordModel } from "@/model/ExposureRecord";
import { TradeRecordModel } from "@/model/TradeRecord";

type TradeSide = "buy" | "sell";
type TradeRequest = { side?: unknown; shares?: unknown; price?: unknown };
type RiskLevel = "極低風險" | "偏低風險" | "普通風險" | "高風險" | "極高風險";

class TradeError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function getRiskLevel(ratio: number): RiskLevel {
  if (ratio <= 50) return "極低風險";
  if (ratio <= 80) return "偏低風險";
  if (ratio <= 120) return "普通風險";
  if (ratio <= 160) return "高風險";
  return "極高風險";
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
    const records = await TradeRecordModel.find().sort({ createdAt: -1 }).limit(limit).lean();
    return NextResponse.json({ records, count: records.length });
  } catch (error) {
    console.error("Failed to read trade records", error);
    return NextResponse.json({ error: "無法讀取交易紀錄。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: TradeRequest;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "請提供有效的 JSON 資料。" }, { status: 400 }); }

  const side = body.side as TradeSide;
  const shares = Number(body.shares);
  const price = Number(body.price);
  if (side !== "buy" && side !== "sell") return NextResponse.json({ error: "交易方向必須是買入或賣出。" }, { status: 400 });
  if (!Number.isFinite(shares) || !Number.isFinite(price) || shares <= 0 || price <= 0) return NextResponse.json({ error: "股數與價格必須是大於 0 的數字。" }, { status: 400 });

  const database = await connectToDatabase();
  const session = await database.startSession();
  try {
    let result: Record<string, unknown> | undefined;
    await session.withTransaction(async () => {
      const record = await ExposureRecordModel.findOne().sort({ updatedAt: -1 }).session(session);
      if (!record) throw new TradeError("請先完成起始資金設定。");

      const accounting = await getPositionAccounting(record, session);
      const amount = shares * price;
      const fee = calculateBrokerFee(amount);
      const tax = side === "sell" ? calculateEtfSellTax(amount) : 0;
      const cashChange = side === "buy" ? -(amount + fee) : amount - fee - tax;
      const holdingShares = accounting.holdingShares;

      if (side === "buy" && -cashChange > accounting.cash) {
        throw new TradeError("可用現金不足（含手續費），無法完成買入。");
      }
      if (side === "sell" && shares > holdingShares) {
        throw new TradeError(`持有股數不足，目前可賣出 ${holdingShares.toLocaleString("zh-TW")} 股。`);
      }

      const nextHoldingShares = side === "buy" ? holdingShares + shares : holdingShares - shares;
      const averageCost = holdingShares > 0 ? accounting.costBasis / holdingShares : 0;
      const costBasisReduction = side === "sell" ? averageCost * shares : 0;
      const tradeProfitLoss = side === "sell" ? cashChange - costBasisReduction : 0;
      const realizedProfitLoss = accounting.realizedProfitLoss + tradeProfitLoss;
      const investment = side === "buy"
        ? accounting.costBasis + amount + fee
        : nextHoldingShares === 0
          ? 0
          : accounting.costBasis - costBasisReduction;
      const cash = accounting.cash + cashChange;
      const portfolioValue = investment + cash;
      const exposureNotional = investment * 2;
      const exposureRatio = portfolioValue > 0 ? (exposureNotional / portfolioValue) * 100 : 0;
      const level = getRiskLevel(exposureRatio);

      const updated = await ExposureRecordModel.findByIdAndUpdate(
        record.id,
        {
          investment,
          realizedProfitLoss,
          holdingShares: nextHoldingShares,
          cash,
          portfolioValue,
          exposureNotional,
          exposureRatio,
          level,
          lastTrade: { side, shares, price, amount, fee, tax, cashChange, executedAt: new Date() },
        },
        { returnDocument: "after", runValidators: true, session },
      );

      const [tradeRecord] = await TradeRecordModel.create([{
        exposureRecordId: record._id,
        side,
        shares,
        price,
        amount,
        fee,
        tax,
        cashChange,
        costBasisReduction,
        tradeProfitLoss,
        realizedProfitLossAfter: realizedProfitLoss,
        investmentAfter: investment,
        holdingSharesAfter: nextHoldingShares,
        cashAfter: cash,
        portfolioValueAfter: portfolioValue,
      }], { session });

      result = {
        id: updated?.id,
        tradeRecordId: tradeRecord.id,
        investment,
        realizedProfitLoss,
        tradeProfitLoss,
        holdingShares: nextHoldingShares,
        cash,
        amount,
        fee,
        tax,
        cashChange,
        side,
        message: `${side === "buy" ? "買入" : "賣出"}完成，交易紀錄已儲存。`,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof TradeError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to save transaction", error);
    return NextResponse.json({ error: "無法儲存交易紀錄，請確認 MongoDB 連線設定。" }, { status: 500 });
  } finally {
    await session.endSession();
  }
}

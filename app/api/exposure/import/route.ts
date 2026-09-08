import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import { ExposureRecordModel } from "@/models/ExposureRecord";
import { PositionImportRecordModel } from "@/models/PositionImportRecord";

type ImportRequest = {
  holdingShares?: unknown;
  costBasis?: unknown;
  bookValue?: unknown;
  cash?: unknown;
  asOfDate?: unknown;
};

type RiskLevel = "極低風險" | "偏低風險" | "普通風險" | "高風險" | "極高風險";

const TAIPEI_TODAY = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Taipei",
}).format(new Date());

function getRiskLevel(exposureRatio: number): RiskLevel {
  if (exposureRatio <= 50) return "極低風險";
  if (exposureRatio <= 80) return "偏低風險";
  if (exposureRatio <= 120) return "普通風險";
  if (exposureRatio <= 160) return "高風險";
  return "極高風險";
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  let body: ImportRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請提供有效的 JSON 資料。" }, { status: 400 });
  }

  const holdingShares = Number(body.holdingShares);
  const costBasis = Number(body.costBasis);
  const bookValue = Number(body.bookValue);
  const cash = Number(body.cash);
  const asOfDateText = String(body.asOfDate ?? "");
  const asOfDate = new Date(asOfDateText);

  const values = [holdingShares, costBasis, bookValue, cash];
  if (values.some((value) => !Number.isFinite(value))) {
    return NextResponse.json({ error: "請完整填寫有效的數字資料。" }, { status: 400 });
  }
  if (holdingShares <= 0 || costBasis <= 0 || bookValue < 0 || cash < 0) {
    return NextResponse.json({ error: "股數與目前持股成本必須大於 0，目前帳面價值與現金不得小於 0。" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDateText) || Number.isNaN(asOfDate.getTime())) {
    return NextResponse.json({ error: "請從日期選擇器選擇有效的資料基準日期。" }, { status: 400 });
  }
  if (asOfDateText > TAIPEI_TODAY) {
    return NextResponse.json({ error: "資料基準日期不能晚於今天。" }, { status: 400 });
  }

  const calculatedProfitLoss = bookValue - costBasis;
  const calculatedProfitLossRate = (calculatedProfitLoss / costBasis) * 100;
  const portfolioValue = bookValue + cash;
  const exposureNotional = bookValue * 2;
  const exposureRatio = portfolioValue > 0 ? (exposureNotional / portfolioValue) * 100 : 0;
  const level = getRiskLevel(exposureRatio);

  const database = await connectToDatabase();
  const session = await database.startSession();
  try {
    let result: Record<string, unknown> | undefined;
    await session.withTransaction(async () => {
      const [record] = await ExposureRecordModel.create([{
        userId: auth.user.id,
        source: "import",
        realizedProfitLoss: 0,
        investment: costBasis,
        holdingShares,
        cash,
        portfolioValue,
        exposureNotional,
        exposureRatio,
        level,
      }], { session });

      const [importRecord] = await PositionImportRecordModel.create([{
        userId: auth.user.id,
        exposureRecordId: record._id,
        symbol: "00631L",
        holdingShares,
        costBasis,
        bookValue,
        cash,
        calculatedProfitLossRate,
        asOfDate,
      }], { session });

      result = {
        id: record.id,
        importRecordId: importRecord.id,
        holdingShares,
        costBasis,
        bookValue,
        cash,
        calculatedProfitLoss,
        calculatedProfitLossRate,
        asOfDate: asOfDateText,
        message: "既有持股已匯入，持股成本、帳面價值與自動計算的損益率已保存。",
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to import position", error);
    return NextResponse.json({ error: "無法匯入既有持股，MongoDB 未寫入任何資料。" }, { status: 500 });
  } finally {
    await session.endSession();
  }
}

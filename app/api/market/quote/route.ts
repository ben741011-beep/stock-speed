import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";
import { getPositionAccounting } from "@/lib/positionAccounting";
import { calculateNetMarketValue } from "@/lib/trading";
import { connectToDatabase } from "@/lib/mongodb";
import { getTwseQuote } from "@/lib/twseQuote";
import { ExposureRecordModel } from "@/models/ExposureRecord";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  const symbol = new URL(request.url).searchParams.get("symbol")?.toUpperCase() || "00631L";

  try {
    const [quote] = await Promise.all([
      getTwseQuote(symbol),
      connectToDatabase(),
    ]);
    const record = await ExposureRecordModel.findOne({ userId: auth.user.id }).sort({ updatedAt: -1 });
    if (!record) return NextResponse.json({ error: "請先完成起始資金設定。" }, { status: 404 });

    const accounting = await getPositionAccounting(record, auth.user.id);
    const valuation = calculateNetMarketValue(accounting.holdingShares * quote.price);
    const actualPortfolioValue = valuation.netMarketValue + accounting.cash;
    const unrealizedProfitLoss = valuation.netMarketValue - accounting.costBasis;

    return NextResponse.json({
      ...quote,
      holdingShares: accounting.holdingShares,
      grossMarketValue: valuation.grossMarketValue,
      estimatedSellFee: valuation.estimatedSellFee,
      estimatedSellTax: valuation.estimatedSellTax,
      actualStockValue: valuation.netMarketValue,
      costBasis: accounting.costBasis,
      cash: accounting.cash,
      actualPortfolioValue,
      unrealizedProfitLoss,
      realizedProfitLoss: accounting.realizedProfitLoss,
      totalProfitLoss: accounting.realizedProfitLoss + unrealizedProfitLoss,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to fetch market quote", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "無法取得真實股價。" }, { status: 502 });
  }
}

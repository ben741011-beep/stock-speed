import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";
import { getPositionAccounting } from "@/lib/positionAccounting";
import { calculateNetMarketValue } from "@/lib/trading";
import { connectToDatabase } from "@/lib/mongodb";
import { fetchLatestTwseClosingPrice } from "@/lib/twseQuote";
import { ExposureRecordModel } from "@/models/ExposureRecord";
import { upsertStockClosingPrice } from "@/models/StockClosingPrice";
import { getStoredMarketValuationPrice } from "@/models/MarketValuationPrice";

const STOCK_CODE = "00631L";

async function buildQuoteResponse(userId: string, quote: NonNullable<Awaited<ReturnType<typeof getStoredMarketValuationPrice>>>) {
  const record = await ExposureRecordModel.findOne({ userId }).sort({ updatedAt: -1 });
  if (!record) return NextResponse.json({ error: "請先完成起始資金設定。" }, { status: 404 });

  const accounting = await getPositionAccounting(record, userId);
  const valuation = calculateNetMarketValue(accounting.holdingShares * quote.price);
  const actualPortfolioValue = valuation.netMarketValue + accounting.cash;
  const unrealizedProfitLoss = valuation.netMarketValue - accounting.costBasis;

  return NextResponse.json({
    ...quote,
    symbol: quote.stockCode,
    name: quote.stockCode,
    priceSource: "database",
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
}

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  try {
    await connectToDatabase();
    const quote = await getStoredMarketValuationPrice(STOCK_CODE);
    if (!quote) return NextResponse.json({ error: "尚未儲存價格，請先手動取得盤中價格。" }, { status: 404 });
    return await buildQuoteResponse(auth.user.id, quote);
  } catch (error) {
    console.error("Failed to read stored market quote", error);
    return NextResponse.json({ error: "無法讀取已儲存的價格。" }, { status: 500 });
  }
}

export async function POST() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  try {
    await connectToDatabase();
    const fetched = await fetchLatestTwseClosingPrice(STOCK_CODE);
    const write = await upsertStockClosingPrice({
      stockCode: fetched.symbol,
      close: fetched.price,
      quoteDate: fetched.quoteDate,
    });

    return NextResponse.json({
      message: `${write.quote.quoteDate} 收盤價 NT$ ${write.quote.close.toFixed(2)} 已儲存。`,
      quote: write.quote,
      write: {
        matchedCount: write.matchedCount,
        modifiedCount: write.modifiedCount,
        upsertedCount: write.upsertedCount,
      },
    });
  } catch (error) {
    console.error("Failed to refresh market quote", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "無法更新收盤價。" }, { status: 502 });
  }
}

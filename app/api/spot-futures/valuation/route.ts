import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import { fetchLatestMicroTaiexQuote } from "@/lib/taifexQuote";
import { getSpotFuturesLedger } from "@/lib/spotFuturesLedger";
import { getStoredSpotFuturesValuation } from "@/lib/spotFuturesValuation";
import { fetchLatestTwseClosingPrice, fetchTwseIntradayPrice } from "@/lib/twseQuote";
import { upsertFuturesMarketPrice } from "@/models/FuturesMarketPrice";
import { upsertStockClosingPrice } from "@/models/StockClosingPrice";
import { upsertStockIntradayPrice } from "@/models/StockIntradayPrice";

const noStoreHeaders = { "Cache-Control": "no-store" };

async function fetchAndStore0050Quote() {
  let intradayQuote: Awaited<ReturnType<typeof fetchTwseIntradayPrice>> | null = null;
  try {
    intradayQuote = await fetchTwseIntradayPrice("0050");
  } catch {
    // 沒有當日盤中成交價時，依產品規格退回最近正式收盤價。
  }
  if (intradayQuote) {
    const write = await upsertStockIntradayPrice({
      stockCode: intradayQuote.symbol,
      price: intradayQuote.price,
      quoteAt: new Date(`${intradayQuote.quoteDate}T${intradayQuote.quoteTime}+08:00`),
    });
    return { source: "intraday" as const, write };
  }
  const quote = await fetchLatestTwseClosingPrice("0050");
  const write = await upsertStockClosingPrice({
    stockCode: quote.symbol,
    close: quote.price,
    quoteDate: quote.quoteDate,
  });
  return { source: "close" as const, write };
}

async function fetchAndStoreFuturesQuote(contractMonth: string) {
  const quote = await fetchLatestMicroTaiexQuote(contractMonth);
  const write = await upsertFuturesMarketPrice({
    symbol: "TMF",
    contractMonth: quote.contractMonth,
    price: quote.price,
    quoteDate: quote.quoteDate,
    tradingSession: quote.tradingSession,
  });
  return { write };
}

function rejectedMessage(result: PromiseRejectedResult) {
  return result.reason instanceof Error ? result.reason.message : "行情更新失敗。";
}

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    await connectToDatabase();
    const stored = await getStoredSpotFuturesValuation(auth.user.id);
    if (!stored) return NextResponse.json({ error: "請先完成 0050＋微臺初始設定。" }, { status: 404, headers: noStoreHeaders });
    return NextResponse.json(stored, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Failed to read stored spot futures valuation", error);
    return NextResponse.json({ error: "無法讀取已儲存行情或計算曝險。" }, { status: 500, headers: noStoreHeaders });
  }
}

export async function POST() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    await connectToDatabase();
    const ledger = await getSpotFuturesLedger(auth.user.id);
    if (!ledger) return NextResponse.json({ error: "請先完成 0050＋微臺初始設定。" }, { status: 404, headers: noStoreHeaders });
    const needsSpot = ledger.inventory.spotShares > 0;
    const months = ledger.inventory.futuresPositions.map((position) => position.contractMonth);
    const tasks: Array<{ key: string; run: () => Promise<unknown> }> = [
      ...(needsSpot ? [{ key: "0050", run: fetchAndStore0050Quote }] : []),
      ...months.map((month) => ({ key: month, run: () => fetchAndStoreFuturesQuote(month) })),
    ];
    const settled = await Promise.allSettled(tasks.map((task) => task.run()));
    const refresh = Object.fromEntries(settled.map((result, index) => [
      tasks[index].key,
      result.status === "fulfilled"
        ? { ok: true as const, result: result.value }
        : { ok: false as const, error: rejectedMessage(result) },
    ]));
    const failedCount = settled.filter((result) => result.status === "rejected").length;
    const succeededCount = settled.length - failedCount;

    if (tasks.length > 0 && succeededCount === 0) {
      return NextResponse.json({ error: "所需行情皆更新失敗，已保留原有資料。", refresh }, {
        status: 502,
        headers: noStoreHeaders,
      });
    }

    const stored = await getStoredSpotFuturesValuation(auth.user.id, ledger);
    if (!stored) return NextResponse.json({ error: "帳本在行情更新後不存在。", refresh }, { status: 409, headers: noStoreHeaders });
    const partial = failedCount > 0;
    return NextResponse.json({
      ...stored,
      refresh,
      partial,
      message: partial
        ? "部分行情更新失敗；已使用資料庫中可用的最新行情，請核對兩筆日期。"
        : tasks.length === 0
          ? "目前沒有持倉，已直接重新計算曝險。"
          : "所需的 0050 與微臺行情已保存並重新計算曝險。",
    }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Failed to refresh spot futures valuation", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "無法更新官方行情。" }, {
      status: 502,
      headers: noStoreHeaders,
    });
  }
}

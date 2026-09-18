import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";
import { fetchTwseIntradayPrice } from "@/lib/twseQuote";
import { connectToDatabase } from "@/lib/mongodb";
import { upsertStockIntradayPrice } from "@/models/StockIntradayPrice";

export async function POST() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  try {
    const fetched = await fetchTwseIntradayPrice("00631L");
    await connectToDatabase();
    const write = await upsertStockIntradayPrice({
      stockCode: fetched.symbol,
      price: fetched.price,
      quoteAt: new Date(`${fetched.quoteDate}T${fetched.quoteTime}+08:00`),
    });
    const storedAt = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei", dateStyle: "short", timeStyle: "medium",
    }).format(new Date(write.quote.quoteAt));
    return NextResponse.json({
      message: `${storedAt} 盤中成交價 NT$ ${write.quote.price.toFixed(2)} ${write.modifiedCount + write.upsertedCount > 0 ? "已儲存。" : "已是資料庫中的最新價格。"}`,
      quote: write.quote,
      write: {
        matchedCount: write.matchedCount,
        modifiedCount: write.modifiedCount,
        upsertedCount: write.upsertedCount,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to read intraday market quote", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "無法取得盤中價格。" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

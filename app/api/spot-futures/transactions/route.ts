import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import { addSpotFuturesTrade, getSpotFuturesLedger, SpotFuturesLedgerError } from "@/lib/spotFuturesLedger";
import { parseSpotFuturesTradeInput } from "@/models/SpotFuturesTransaction";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    await connectToDatabase();
    const ledger = await getSpotFuturesLedger(auth.user.id);
    if (!ledger) return NextResponse.json({ error: "請先完成初始設定。" }, { status: 404, headers: noStore });
    return NextResponse.json({ records: ledger.transactions, count: ledger.transactions.length }, { headers: noStore });
  } catch (error) {
    console.error("Failed to read spot futures transactions", error);
    return NextResponse.json({ error: "無法讀取交易紀錄。" }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const input = parseSpotFuturesTradeInput(await request.json());
    await connectToDatabase();
    const result = await addSpotFuturesTrade(auth.user.id, input);
    return NextResponse.json({
      ...result,
      message: result.idempotent ? "這筆交易已記錄，已載入原結果。" : "交易已記錄並重新彙整庫存。",
    }, { status: result.idempotent ? 200 : 201, headers: noStore });
  } catch (error) {
    const validation = error instanceof SyntaxError || (error instanceof Error && /必須|格式|欄位|不可/.test(error.message));
    const status = error instanceof SpotFuturesLedgerError ? error.status : validation ? 400 : 500;
    const message = status < 500 && error instanceof Error ? error.message : "無法新增交易。";
    if (status >= 500) console.error("Failed to save spot futures transaction", error);
    return NextResponse.json({ error: message }, { status, headers: noStore });
  }
}

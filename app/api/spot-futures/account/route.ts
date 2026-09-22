import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import { getSpotFuturesLedger, initializeSpotFuturesLedger, SpotFuturesLedgerError, updateSpotFuturesFunds } from "@/lib/spotFuturesLedger";
import { parseFuturesSafetyMarginUpdate, parseSpotFuturesAccountInput, parseSpotFuturesFundsUpdate, updateFuturesSafetyMargin } from "@/models/SpotFuturesAccount";
import { parseOpeningPositionsFromInitialization } from "@/models/SpotFuturesTransaction";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    await connectToDatabase();
    const ledger = await getSpotFuturesLedger(auth.user.id);
    if (!ledger) return NextResponse.json({ error: "尚未完成 0050＋微臺初始設定。" }, { status: 404, headers: noStore });
    return NextResponse.json({ ledger }, { headers: noStore });
  } catch (error) {
    console.error("Failed to read spot futures ledger", error);
    return NextResponse.json({ error: "無法讀取 0050＋微臺帳本。" }, { status: 500, headers: noStore });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const body: unknown = await request.json();
    const input = parseSpotFuturesAccountInput(body);
    const openings = parseOpeningPositionsFromInitialization(body);
    await connectToDatabase();
    const result = await initializeSpotFuturesLedger(auth.user.id, input, openings);
    return NextResponse.json({
      ...result,
      message: result.idempotent ? "初始設定已存在，已載入原資料。" : "初始設定與起始庫存已建立。",
    }, { status: result.idempotent ? 200 : 201, headers: noStore });
  } catch (error) {
    const validation = error instanceof SyntaxError || (error instanceof Error && /必須|格式|欄位|不可|最多/.test(error.message));
    const status = error instanceof SpotFuturesLedgerError ? error.status : validation ? 400 : 500;
    const message = status < 500 && error instanceof Error ? error.message : "無法建立初始設定。";
    if (status >= 500) console.error("Failed to initialize spot futures ledger", error);
    return NextResponse.json({ error: message }, { status, headers: noStore });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const body: unknown = await request.json();
    await connectToDatabase();
    if (body && typeof body === "object" && !Array.isArray(body) && "futuresSafetyMarginPerContract" in body) {
      const futuresSafetyMarginPerContract = parseFuturesSafetyMarginUpdate(body);
      const result = await updateFuturesSafetyMargin(auth.user.id, futuresSafetyMarginPerContract);
      if (!result) return NextResponse.json({ error: "請先完成初始設定。" }, { status: 404, headers: noStore });
      const ledger = await getSpotFuturesLedger(auth.user.id);
      if (!ledger) throw new Error("安全保證金更新後找不到帳本。");
      return NextResponse.json({
        ...result,
        ledger,
        message: result.modifiedCount === 0 ? "安全保證金未變更。" : "每口安全保證金已更新。",
      }, { headers: noStore });
    }

    const input = parseSpotFuturesFundsUpdate(body);
    const result = await updateSpotFuturesFunds(auth.user.id, input);
    return NextResponse.json({
      ...result,
      message: result.modifiedCount === 0 ? "台股現金與期貨保證金資金未變更。" : "台股現金與期貨保證金資金已更新。",
    }, { headers: noStore });
  } catch (error) {
    const validation = error instanceof SyntaxError || (error instanceof Error && /必須|格式|只能|不可|無法調整/.test(error.message));
    const status = error instanceof SpotFuturesLedgerError ? error.status : validation ? 400 : 500;
    const message = status < 500 && error instanceof Error ? error.message : "無法更新帳戶設定。";
    if (status >= 500) console.error("Failed to update spot futures account", error);
    return NextResponse.json({ error: message }, { status, headers: noStore });
  }
}

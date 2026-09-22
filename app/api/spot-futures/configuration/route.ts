import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import {
  getSpotFuturesConfiguration,
  parseSpotFuturesConfigurationInput,
  upsertSpotFuturesConfiguration,
} from "@/models/SpotFuturesConfiguration";

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    await connectToDatabase();
    const configuration = await getSpotFuturesConfiguration(auth.user.id);
    if (!configuration) return NextResponse.json({ error: "尚未建立 0050＋微臺配置。" }, { status: 404 });
    return NextResponse.json({ configuration }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to read spot futures configuration", error);
    return NextResponse.json({ error: "無法讀取 0050＋微臺配置。" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const input = parseSpotFuturesConfigurationInput(await request.json());
    await connectToDatabase();
    const result = await upsertSpotFuturesConfiguration(auth.user.id, input);
    return NextResponse.json({
      configuration: result.configuration,
      write: { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedCount: result.upsertedCount },
      message: "0050＋微臺配置已儲存，請更新行情重新計算。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "無法儲存 0050＋微臺配置。";
    const isValidationError = /必須|格式|欄位|不可/.test(message);
    if (!isValidationError) console.error("Failed to save spot futures configuration", error);
    return NextResponse.json({ error: isValidationError ? message : "無法儲存 0050＋微臺配置。" }, { status: isValidationError ? 400 : 500 });
  }
}

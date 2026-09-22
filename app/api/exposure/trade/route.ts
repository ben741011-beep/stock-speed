import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";
import { getPositionAccounting } from "@/lib/positionAccounting";
import { connectToDatabase } from "@/lib/mongodb";
import {
  ExposureFundsUpdateError,
  ExposureRecordModel,
  parseExposureFundsUpdate,
  updateExposureFunds,
} from "@/models/ExposureRecord";

const noStore = { "Cache-Control": "no-store" };

async function currentRecord(userId: string) {
  await connectToDatabase();
  return ExposureRecordModel.findOne({ userId }).sort({ updatedAt: -1 });
}

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  try {
    const record = await currentRecord(auth.user.id);
    if (!record) return NextResponse.json({ error: "請先完成起始資金設定。" }, { status: 404, headers: noStore });

    const accounting = await getPositionAccounting(record, auth.user.id);
    return NextResponse.json({
      investment: accounting.costBasis,
      realizedProfitLoss: accounting.realizedProfitLoss,
      holdingShares: accounting.holdingShares,
      cash: accounting.cash,
      updatedAt: record.updatedAt,
    }, { headers: noStore });
  } catch (error) {
    console.error("Failed to read exposure record", error);
    return NextResponse.json({ error: "無法讀取暴險紀錄。" }, { status: 500, headers: noStore });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  try {
    const input = parseExposureFundsUpdate(await request.json());
    await connectToDatabase();
    const result = await updateExposureFunds(auth.user.id, input);
    return NextResponse.json({
      ...result,
      message: result.modifiedCount === 0 ? "目前可用現金未變更。" : "目前可用現金已更新。",
    }, { headers: noStore });
  } catch (error) {
    const status = error instanceof ExposureFundsUpdateError
      ? error.status
      : error instanceof SyntaxError
        ? 400
        : 500;
    const message = status < 500 && error instanceof Error ? error.message : "無法更新帳戶資金。";
    if (status >= 500) console.error("Failed to update exposure funds", error);
    return NextResponse.json({ error: message }, { status, headers: noStore });
  }
}

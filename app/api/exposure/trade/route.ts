import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";
import { getPositionAccounting } from "@/lib/positionAccounting";
import { connectToDatabase } from "@/lib/mongodb";
import { ExposureRecordModel } from "@/models/ExposureRecord";

async function currentRecord(userId: string) {
  await connectToDatabase();
  return ExposureRecordModel.findOne({ userId }).sort({ updatedAt: -1 });
}

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  try {
    const record = await currentRecord(auth.user.id);
    if (!record) return NextResponse.json({ error: "請先完成起始資金設定。" }, { status: 404 });

    const accounting = await getPositionAccounting(record, auth.user.id);
    return NextResponse.json({
      investment: accounting.costBasis,
      realizedProfitLoss: accounting.realizedProfitLoss,
      holdingShares: accounting.holdingShares,
      cash: accounting.cash,
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    console.error("Failed to read exposure record", error);
    return NextResponse.json({ error: "無法讀取暴險紀錄。" }, { status: 500 });
  }
}

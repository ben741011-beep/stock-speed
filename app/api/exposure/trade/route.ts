import { NextResponse } from "next/server";
import { getPositionAccounting } from "@/lib/positionAccounting";
import { connectToDatabase } from "@/lib/mongodb";
import { ExposureRecordModel } from "@/model/ExposureRecord";

async function currentRecord() {
  await connectToDatabase();
  return ExposureRecordModel.findOne().sort({ updatedAt: -1 });
}

export async function GET() {
  try {
    const record = await currentRecord();
    if (!record) return NextResponse.json({ error: "請先完成起始資金設定。" }, { status: 404 });

    const accounting = await getPositionAccounting(record);
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

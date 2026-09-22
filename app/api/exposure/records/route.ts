import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";
import { connectToDatabase } from "@/lib/mongodb";
import { ExposureRecordModel, hasExposureRecord } from "@/models/ExposureRecord";

type ExposureRequest = { investment?: unknown; cash?: unknown };
type RiskLevel = "極低風險" | "偏低風險" | "普通風險" | "高風險" | "極高風險";

function getRiskLevel(exposureRatio: number): RiskLevel {
  if (exposureRatio <= 50) return "極低風險";
  if (exposureRatio <= 80) return "偏低風險";
  if (exposureRatio <= 120) return "普通風險";
  if (exposureRatio <= 160) return "高風險";
  return "極高風險";
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  let body: ExposureRequest;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "請提供有效的 JSON 資料。" }, { status: 400 }); }
  const investment = Number(body.investment);
  const cash = Number(body.cash);
  if (!Number.isFinite(investment) || !Number.isFinite(cash) || investment < 0 || cash < 0) return NextResponse.json({ error: "投資金額與現金必須是大於或等於 0 的數字。" }, { status: 400 });
  const portfolioValue = investment + cash;
  if (portfolioValue === 0) return NextResponse.json({ error: "投資金額與現金不能同時為 0。" }, { status: 400 });
  const exposureNotional = investment * 2;
  const exposureRatio = (exposureNotional / portfolioValue) * 100;
  const level = getRiskLevel(exposureRatio);
  try {
    await connectToDatabase();
    if (await hasExposureRecord(auth.user.id)) {
      return NextResponse.json({ error: "起始設定已完成，之後請使用買賣功能。" }, { status: 409 });
    }
    const record = await ExposureRecordModel.create({ userId: auth.user.id, source: "initial", realizedProfitLoss: 0, investment, holdingShares: 0, cash, portfolioValue, exposureNotional, exposureRatio, level });
    return NextResponse.json({ id: record?.id, investment, cash, portfolioValue, exposureNotional, exposureRatio, level, message: "起始資金設定已完成。" }, { status: 201 });
  } catch (error) {
    console.error("Failed to save exposure record", error);
    return NextResponse.json({ error: "無法儲存暴險紀錄，請確認 MongoDB 連線設定。" }, { status: 500 });
  }
}

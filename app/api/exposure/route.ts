import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth-api";

type ExposureRequest = { investment?: unknown; cash?: unknown };
const LEVERAGE_MULTIPLIER = 2;

function getRiskLevel(exposureRatio: number) {
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
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請提供有效的 JSON 資料。" }, { status: 400 });
  }

  const investment = Number(body.investment);
  const cash = Number(body.cash);
  if (!Number.isFinite(investment) || !Number.isFinite(cash) || investment < 0 || cash < 0) {
    return NextResponse.json({ error: "投資金額與現金必須是大於或等於 0 的數字。" }, { status: 400 });
  }

  const portfolioValue = investment + cash;
  if (portfolioValue === 0) {
    return NextResponse.json({ error: "投資金額與現金不能同時為 0。" }, { status: 400 });
  }

  const exposureNotional = investment * LEVERAGE_MULTIPLIER;
  const exposureRatio = (exposureNotional / portfolioValue) * 100;
  return NextResponse.json({
    investment, cash, portfolioValue, exposureNotional, exposureRatio,
    leverageMultiplier: LEVERAGE_MULTIPLIER, level: getRiskLevel(exposureRatio),
  });
}

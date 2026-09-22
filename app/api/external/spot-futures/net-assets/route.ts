import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getStoredSpotFuturesValuation } from "@/lib/spotFuturesValuation";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...responseHeaders, ...headers } });
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

export async function GET(request: Request) {
  const apiKey = process.env.EXTERNAL_ASSET_API_KEY ?? "";
  const ownerId = process.env.EXTERNAL_ASSET_OWNER_ID ?? "";

  if (apiKey.length < 32 || !/^[a-f\d]{24}$/i.test(ownerId)) {
    console.error("External asset API is missing a valid API key or owner id.");
    return json({ error: "外部資產API尚未完成伺服器設定。" }, 503);
  }

  const token = bearerToken(request);
  if (!token || !safeEqual(token, apiKey)) {
    return json({ error: "未授權的API請求。" }, 401, { "WWW-Authenticate": "Bearer" });
  }

  try {
    await connectToDatabase();
    const stored = await getStoredSpotFuturesValuation(ownerId);
    if (!stored) return json({ error: "尚未建立0050＋微臺帳本。" }, 404);
    if (!stored.valuation) {
      return json({ error: "缺少估值所需行情。", missingQuotes: stored.missingQuotes }, 409);
    }

    const updatedAt = [stored.quotes.spot?.fetchedAt, ...stored.quotes.futures.map((quote) => quote.fetchedAt)]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

    return json({
      netAssets: stored.valuation.netAssets,
      currency: "TWD",
      updatedAt,
    });
  } catch (error) {
    console.error("Failed to serve external spot futures net assets", error);
    return json({ error: "目前無法讀取淨資產。" }, 500);
  }
}

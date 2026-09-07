import { NextResponse } from "next/server";

/**
 * Minimal API Route Handler used to confirm the application's backend is live.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

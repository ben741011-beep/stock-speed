import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "尚未登入。" }, { status: 401 });
    }

    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to read auth session", error);
    return NextResponse.json({ error: "目前無法確認登入狀態。" }, { status: 500 });
  }
}

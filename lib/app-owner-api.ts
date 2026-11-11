import "server-only";

import { NextResponse } from "next/server";
import { getAppOwner } from "@/lib/app-owner";

export async function requireAppOwner() {
  try {
    return { user: await getAppOwner(), response: null } as const;
  } catch (error) {
    console.error("Failed to resolve the single app owner", error);
    return {
      user: null,
      response: NextResponse.json(
        { error: "目前無法確認單一資料擁有者，請檢查資料庫使用者設定。" },
        { status: 503 },
      ),
    } as const;
  }
}

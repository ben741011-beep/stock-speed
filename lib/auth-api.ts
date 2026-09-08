import "server-only";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function requireApiSession() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "請先登入。" }, { status: 401 }),
    } as const;
  }

  return { user, response: null } as const;
}

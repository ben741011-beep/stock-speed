import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { setSessionCookie } from "@/lib/session";
import {
  AuthUserModel,
  parseAuthCredentials,
  serializeAuthUser,
} from "@/models/AuthUser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請提供有效的 JSON 資料。" }, { status: 400 });
  }

  const parsed = parseAuthCredentials(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email 或密碼錯誤。" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const user = await AuthUserModel.findOne({ email: parsed.data.email })
      .select("+passwordHash")
      .exec();

    const passwordMatches = user
      ? await bcrypt.compare(parsed.data.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      return NextResponse.json({ error: "Email 或密碼錯誤。" }, { status: 401 });
    }

    await setSessionCookie(user.id);

    return NextResponse.json({
      user: serializeAuthUser(user),
      message: "登入成功。",
    });
  } catch (error) {
    console.error("Failed to log in auth user", error);
    return NextResponse.json({ error: "目前無法登入，請稍後再試。" }, { status: 500 });
  }
}

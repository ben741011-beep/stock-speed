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
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const exists = await AuthUserModel.exists({ email: parsed.data.email });
    if (exists) {
      return NextResponse.json({ error: "此 email 已經註冊。" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await AuthUserModel.create({
      email: parsed.data.email,
      passwordHash,
    });

    await setSessionCookie(user.id);

    return NextResponse.json(
      { user: serializeAuthUser(user), message: "註冊成功，已為你登入。" },
      { status: 201 },
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "此 email 已經註冊。" }, { status: 409 });
    }

    console.error("Failed to register auth user", error);
    return NextResponse.json({ error: "目前無法完成註冊，請稍後再試。" }, { status: 500 });
  }
}

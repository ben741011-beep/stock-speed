import { type NextRequest, NextResponse } from "next/server";
import { getTheme, isTheme, THEME_COOKIE_NAME } from "@/lib/theme";

const noStoreHeaders = { "Cache-Control": "no-store" };

export function GET(request: NextRequest) {
  const theme = getTheme(request.cookies.get(THEME_COOKIE_NAME)?.value);

  return NextResponse.json({ theme }, { headers: noStoreHeaders });
}

export async function PUT(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "請提供有效的 JSON。" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const theme = body && typeof body === "object" && "theme" in body
    ? (body as { theme: unknown }).theme
    : undefined;

  if (!isTheme(theme)) {
    return NextResponse.json(
      { error: "風格只支援 light 或 dark。" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const response = NextResponse.json({ theme }, { headers: noStoreHeaders });
  response.cookies.set(THEME_COOKIE_NAME, theme, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

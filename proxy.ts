import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/", "/login", "/register"]);
const PUBLIC_API_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/external/spot-futures/net-assets",
  "/api/theme",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "請先登入。" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

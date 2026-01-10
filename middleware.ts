// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ACCESS_COOKIE = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";

export function middleware(request: NextRequest) {
  const cookie = request.cookies.get(ACCESS_COOKIE);
  const { pathname } = request.nextUrl;

  // Allow login page
  if (pathname === "/login") {
    if (cookie) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  // Allow auth API and static assets
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Protect everything else
  if (!cookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};

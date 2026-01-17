import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";
const BLOCKED_PATH_PREFIXES = ["/api/public", "/api/upload", "/api/utils/validate-hls", "/api/_debug"];

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/_next",
  "/favicon.ico",
];

function blockedResponse(pathname: string) {
  console.warn("Blocked request to disabled endpoint", { path: pathname });
  return NextResponse.json(
    { error: "Ce service n'est pas disponible pour le moment." },
    { status: 403 }
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (BLOCKED_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return blockedResponse(pathname);
  }

  if (PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// matcher (évite de matcher les assets statiques)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

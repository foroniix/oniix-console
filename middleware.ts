// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ACCESS_COOKIE = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";
const BLOCKED_PATH_PREFIXES = ["/api/public", "/api/upload", "/api/utils/validate-hls", "/api/_debug"];

const SECURITY_HEADERS: Record<string, string> = {
  ...(process.env.NODE_ENV === "production"
    ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload" }
    : {}),
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "font-src 'self' data:",
  ].join("; "),
};

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function withSecurityHeaders(res: NextResponse) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => res.headers.set(key, value));
  return res;
}

function blockedResponse(pathname: string) {
  console.warn("Blocked request to disabled endpoint", { path: pathname });
  return NextResponse.json(
    { error: "Ce service n'est pas disponible pour le moment." },
    { status: 403 }
  );
}

function csrfResponse() {
  return NextResponse.json({ error: "Action non autorisee." }, { status: 403 });
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowedOrigin = request.nextUrl.origin;

  if (origin) return origin === allowedOrigin;
  if (referer) return referer.startsWith(allowedOrigin);
  return false;
}

export function middleware(request: NextRequest) {
  const cookie = request.cookies.get(ACCESS_COOKIE);
  const { pathname } = request.nextUrl;

  if (BLOCKED_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return withSecurityHeaders(blockedResponse(pathname));
  }

  if (pathname.startsWith("/api")) {
    if (!request.method || !unsafeMethods.has(request.method.toUpperCase())) {
      // noop
    } else if (!isSameOrigin(request)) {
      return withSecurityHeaders(csrfResponse());
    }
  }

  // Allow login page
  if (pathname === "/login") {
    if (cookie) return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url)));
    return withSecurityHeaders(NextResponse.next());
  }

  // Allow auth API and static assets
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return withSecurityHeaders(NextResponse.next());
  }

  // Protect everything else
  if (!cookie) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

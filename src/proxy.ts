import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ACCESS_COOKIE = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";
const BLOCKED_PATH_PREFIXES = ["/api/public", "/api/upload", "/api/utils/validate-hls", "/api/_debug"];
const PUBLIC_PATH_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/accept-invite",
  "/console/login",
  "/console/signup",
  "/console/accept-invite",
  "/cookies",
  "/privacy",
  "/we",
  "/web",
];
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/web/auth/login",
  "/api/web/auth/me",
  "/api/web/auth/logout",
  "/api/web/auth/signup",
  "/api/web/live",
  "/api/web/catalog",
  "/api/web/replays",
  "/api/web/analytics/playback",
  "/api/mobile",
  "/api/analytics/ingest",
  "/api/analytics/heartbeat",
  "/api/replays/process/cron",
];
const NOINDEX_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/accept-invite",
  "/console/login",
  "/console/signup",
  "/console/accept-invite",
];
const CSRF_EXEMPT_API_PREFIXES = [
  "/api/mobile",
  "/api/analytics/ingest",
  "/api/analytics/heartbeat",
  "/api/replays/process/cron",
];

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

function withSecurityHeaders(response: NextResponse) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

function applyIndexingHeaders(
  response: NextResponse,
  pathname: string,
  isPublicPath: boolean,
  isPublicApiPath: boolean
) {
  const isStaticAsset = pathname.startsWith("/_next") || pathname.includes(".");
  const shouldNoindex =
    NOINDEX_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    (!isStaticAsset && !pathname.startsWith("/api") && !isPublicApiPath && !isPublicPath);

  if (shouldNoindex) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return response;
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

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest) {
  const cookie = request.cookies.get(ACCESS_COOKIE);
  const { pathname } = request.nextUrl;
  const isPublicPath = matchesPrefix(pathname, PUBLIC_PATH_PREFIXES);
  const isPublicApiPath = matchesPrefix(pathname, PUBLIC_API_PREFIXES);
  const isCsrfExemptApiPath = matchesPrefix(pathname, CSRF_EXEMPT_API_PREFIXES);

  if (pathname === "/login" || pathname === "/signup" || pathname === "/accept-invite") {
    if (cookie && (pathname === "/login" || pathname === "/signup")) {
      return applyIndexingHeaders(
        withSecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url))),
        pathname,
        isPublicPath,
        isPublicApiPath
      );
    }

    const redirectedUrl = new URL(
      pathname === "/login"
        ? "/console/login"
        : pathname === "/signup"
          ? "/console/signup"
          : "/console/accept-invite",
      request.url
    );
    redirectedUrl.search = request.nextUrl.search;

    return applyIndexingHeaders(
      withSecurityHeaders(NextResponse.redirect(redirectedUrl)),
      pathname,
      isPublicPath,
      isPublicApiPath
    );
  }

  if (BLOCKED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return applyIndexingHeaders(withSecurityHeaders(blockedResponse(pathname)), pathname, isPublicPath, isPublicApiPath);
  }

  if (pathname.startsWith("/api")) {
    const method = request.method?.toUpperCase();
    if (method && unsafeMethods.has(method) && !isCsrfExemptApiPath && !isSameOrigin(request)) {
      return applyIndexingHeaders(withSecurityHeaders(csrfResponse()), pathname, isPublicPath, isPublicApiPath);
    }
  }

  if (pathname === "/console/login" || pathname === "/console/signup") {
    return applyIndexingHeaders(withSecurityHeaders(NextResponse.next()), pathname, isPublicPath, isPublicApiPath);
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    isPublicPath ||
    isPublicApiPath
  ) {
    return applyIndexingHeaders(withSecurityHeaders(NextResponse.next()), pathname, isPublicPath, isPublicApiPath);
  }

  if (!cookie) {
    return applyIndexingHeaders(
      withSecurityHeaders(NextResponse.redirect(new URL("/console/login", request.url))),
      pathname,
      isPublicPath,
      isPublicApiPath
    );
  }

  return applyIndexingHeaders(withSecurityHeaders(NextResponse.next()), pathname, isPublicPath, isPublicApiPath);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

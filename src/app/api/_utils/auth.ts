import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ACCESS_COOKIE = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";
export const REFRESH_COOKIE = process.env.REFRESH_TOKEN_COOKIE_NAME || "oniix-refresh-token";

/**
 * Decode a JWT without verifying signature (we rely on httpOnly cookies + HTTPS).
 * This is used only to extract claims (sub, app_metadata, user_metadata).
 */
export function decodeJwt<T = any>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const jsonStr = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

export type AuthContext = {
  accessToken: string;
  userId: string;
  tenantId: string | null;
  role: string | null;
};

/**
 * Require an authenticated user based on the access token cookie.
 * Returns either {ctx} or a NextResponse (401).
 */
export async function requireAuth(): Promise<{ ctx: AuthContext } | { res: NextResponse }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const claims: any = decodeJwt(accessToken);
  const userId = claims?.sub;
  const role = claims?.app_metadata?.role ?? claims?.user_metadata?.role ?? null;
  const tenantId = claims?.app_metadata?.tenant_id ?? claims?.user_metadata?.tenant_id ?? null;

  if (!userId) {
    return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { ctx: { accessToken, userId, tenantId, role } };
}

export function requireTenant(ctx: AuthContext): NextResponse | null {
  if (!ctx.tenantId) {
    return NextResponse.json(
      { error: "Tenant not set for this user (missing tenant_id claim)." },
      { status: 403 }
    );
  }
  return null;
}

export function requireRole(ctx: AuthContext, allowed: string[]): NextResponse | null {
  const r = (ctx.role || "").toLowerCase();
  if (!allowed.map(a => a.toLowerCase()).includes(r)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseUser } from "./supabase";

export const ACCESS_COOKIE = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";
export const REFRESH_COOKIE = process.env.REFRESH_TOKEN_COOKIE_NAME || "oniix-refresh-token";

export type AuthContext = {
  accessToken: string;
  userId: string;
  tenantId: string | null;
  role: string | null;
};

const getUserForToken = cache(async (accessToken: string) => {
  const sb = supabaseUser(accessToken);
  return sb.auth.getUser();
});

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

  try {
    const { data, error } = await getUserForToken(accessToken);
    if (error || !data?.user) {
      return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const user = data.user;
    const role = (user.app_metadata as any)?.role ?? (user.user_metadata as any)?.role ?? null;
    const tenantId =
      (user.app_metadata as any)?.tenant_id ?? (user.user_metadata as any)?.tenant_id ?? null;

    return { ctx: { accessToken, userId: user.id, tenantId, role } };
  } catch {
    return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
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

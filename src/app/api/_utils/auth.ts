import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseUser } from "./supabase";

export const ACCESS_COOKIE = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";
export const REFRESH_COOKIE = process.env.REFRESH_TOKEN_COOKIE_NAME || "oniix-refresh-token";

export type AuthContext = {
  accessToken: string;
  userId: string;
  tenantId: string | null;
  role: string | null;
  user: User;
};

const getUserForToken = cache(async (accessToken: string) => {
  const sb = supabaseUser(accessToken);
  return sb.auth.getUser();
});

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Votre session a expiré. Veuillez vous reconnecter." },
    { status: 401 }
  );
}

/**
 * Require an authenticated user based on the access token cookie.
 * Returns either {ctx} or a NextResponse (401).
 */
export async function requireAuth(): Promise<{ ctx: AuthContext } | { res: NextResponse }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    console.warn("Missing access token cookie");
    return { res: unauthorizedResponse() };
  }

  try {
    const { data, error } = await getUserForToken(accessToken);
    if (error || !data?.user) {
      console.warn("Invalid session", { error: error?.message });
      return { res: unauthorizedResponse() };
    }

    const user = data.user;
    const role = (user.app_metadata as any)?.role ?? (user.user_metadata as any)?.role ?? null;
    const tenantId =
      (user.app_metadata as any)?.tenant_id ?? (user.user_metadata as any)?.tenant_id ?? null;

    return { ctx: { accessToken, userId: user.id, tenantId, role, user } };
  } catch {
    console.warn("Auth check failed");
    return { res: unauthorizedResponse() };
  }
}

export function requireTenant(ctx: AuthContext): NextResponse | null {
  if (!ctx.tenantId) {
    console.warn("Missing tenant_id in auth context", { userId: ctx.userId });
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  return null;
}

export function requireRole(ctx: AuthContext, allowed: string[]): NextResponse | null {
  const r = (ctx.role || "").toLowerCase();
  if (!allowed.map(a => a.toLowerCase()).includes(r)) {
    console.warn("Forbidden role", { userId: ctx.userId, role: ctx.role });
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  return null;
}

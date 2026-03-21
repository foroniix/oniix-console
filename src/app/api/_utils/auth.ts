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

const isTestEnv = process.env.NODE_ENV === "test";
const warn = (...args: Parameters<typeof console.warn>) => {
  if (!isTestEnv) console.warn(...args);
};

const getUserForToken = cache(async (accessToken: string) => {
  const sb = supabaseUser(accessToken);
  return sb.auth.getUser();
});

const getMembershipForToken = cache(
  async (accessToken: string, tenantId: string, userId: string) => {
    const sb = supabaseUser(accessToken);
    return sb
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();
  }
);

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Votre session a expire. Veuillez vous reconnecter." },
    { status: 401 }
  );
}

function readBearerToken(request?: Request | null) {
  const authHeader = (request?.headers.get("authorization") ?? "").trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) return "";
  return authHeader.slice(7).trim();
}

/**
 * Require an authenticated user based on a bearer token or the access token cookie.
 * Returns either {ctx} or a NextResponse (401).
 */
export async function requireAuth(
  request?: Request | null
): Promise<{ ctx: AuthContext } | { res: NextResponse }> {
  const headerToken = readBearerToken(request);
  let accessToken = headerToken;

  if (!accessToken) {
    const cookieStore = await cookies();
    accessToken = cookieStore.get(ACCESS_COOKIE)?.value ?? "";
  }

  if (!accessToken) {
    warn("Missing access token");
    return { res: unauthorizedResponse() };
  }

  try {
    const { data, error } = await getUserForToken(accessToken);
    if (error || !data?.user) {
      warn("Invalid session", { error: error?.message });
      return { res: unauthorizedResponse() };
    }

    const user = data.user;
    const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
    const role = typeof appMetadata.role === "string" ? appMetadata.role : null;
    const tenantId = typeof appMetadata.tenant_id === "string" ? appMetadata.tenant_id : null;

    return { ctx: { accessToken, userId: user.id, tenantId, role, user } };
  } catch {
    warn("Auth check failed");
    return { res: unauthorizedResponse() };
  }
}

export async function requireTenant(ctx: AuthContext): Promise<NextResponse | null> {
  if (!ctx.tenantId) {
    warn("Missing tenant_id in auth context", { userId: ctx.userId });
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }
  try {
    const { data, error } = await getMembershipForToken(
      ctx.accessToken,
      ctx.tenantId,
      ctx.userId
    );
    if (error || !data) {
      warn("Tenant membership check failed", {
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        error: error?.message,
      });
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }
  } catch {
    warn("Tenant membership check crashed", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
    });
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }
  return null;
}

export function requireRole(ctx: AuthContext, allowed: string[]): NextResponse | null {
  const r = (ctx.role || "").toLowerCase();
  if (!allowed.map((a) => a.toLowerCase()).includes(r)) {
    warn("Forbidden role", { userId: ctx.userId, role: ctx.role });
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }
  return null;
}

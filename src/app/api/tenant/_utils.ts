import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../_utils/auth";
import { supabaseUser, supabaseAdmin } from "../_utils/supabase";

type TenantContextError = {
  ok: false;
  res: NextResponse;
};

type TenantContextBase = {
  sb: ReturnType<typeof supabaseUser>;
  admin: ReturnType<typeof supabaseAdmin>;
  user: {
    id: string;
    email?: string | null;
    app_metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

type TenantContextWithTenant = {
  ok: true;
  tenant_id: string;
} & TenantContextBase;

type TenantContextOptionalTenant = {
  ok: true;
  tenant_id: string | null;
} & TenantContextBase;

export function jsonError(message: string, status = 400) {
  const safeMessage =
    status === 401
      ? "Votre session a expire. Veuillez vous reconnecter."
      : status === 403
        ? "Acces refuse."
        : message;
  return NextResponse.json({ ok: false, error: safeMessage }, { status });
}

export async function getTenantContext<T extends boolean = true>(
  options?: { requireMembership?: T }
): Promise<T extends false ? TenantContextError | TenantContextOptionalTenant : TenantContextError | TenantContextWithTenant> {
  const auth = await requireAuth();
  if ("res" in auth) return { ok: false as const, res: auth.res } as any;
  const { ctx } = auth;

  if (options?.requireMembership !== false) {
    const tenantRes = await requireTenant(ctx);
    if (tenantRes) return { ok: false as const, res: tenantRes } as any;
    const tenantId = ctx.tenantId;
    if (!tenantId) return { ok: false as const, res: jsonError("Tenant manquant.", 400) } as any;

    return {
      ok: true as const,
      sb: supabaseUser(ctx.accessToken),
      admin: supabaseAdmin(),
      user: ctx.user,
      tenant_id: tenantId,
    } as any;
  }

  return {
    ok: true as const,
    sb: supabaseUser(ctx.accessToken),
    admin: supabaseAdmin(),
    user: ctx.user,
    tenant_id: ctx.tenantId ?? null,
  } as any;
}

export async function requireTenantAdmin(
  sb: ReturnType<typeof supabaseUser>,
  tenant_id: string,
  user_id: string
) {
  const { data, error } = await sb
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenant_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (error) {
    console.error("Tenant admin check error", { error: error.message, tenantId: tenant_id, userId: user_id });
    return { ok: false as const, error: "Une erreur est survenue." };
  }
  const role = (data as any)?.role as string | undefined;

  if (!role || (role !== "owner" && role !== "admin")) {
    return { ok: false as const, error: "Acces refuse." };
  }

  return { ok: true as const, role };
}

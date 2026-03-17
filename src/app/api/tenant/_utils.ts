import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { requireAuth, requireTenant } from "../_utils/auth";
import { supabaseUser, supabaseAdmin } from "../_utils/supabase";
import {
  type TenantCapability,
  hasTenantCapability,
  normalizeTenantRole,
} from "@/lib/tenant-roles";

type TenantContextError = {
  ok: false;
  res: NextResponse;
};

type TenantContextBase = {
  sb: ReturnType<typeof supabaseUser>;
  admin: ReturnType<typeof supabaseAdmin>;
  user: User;
  user_id: string;
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

export async function getTenantContext(
  options: { requireMembership: false }
): Promise<TenantContextError | TenantContextOptionalTenant>;
export async function getTenantContext(
  options?: { requireMembership?: true }
): Promise<TenantContextError | TenantContextWithTenant>;
export async function getTenantContext(
  options?: { requireMembership?: boolean }
): Promise<TenantContextError | TenantContextOptionalTenant | TenantContextWithTenant> {
  const auth = await requireAuth();
  if ("res" in auth) return { ok: false as const, res: auth.res };
  const { ctx } = auth;

  if (options?.requireMembership !== false) {
    const tenantRes = await requireTenant(ctx);
    if (tenantRes) return { ok: false as const, res: tenantRes };
    const tenantId = ctx.tenantId;
    if (!tenantId) return { ok: false as const, res: jsonError("Tenant manquant.", 400) };

    return {
      ok: true as const,
      sb: supabaseUser(ctx.accessToken),
      admin: supabaseAdmin(),
      user: ctx.user,
      user_id: ctx.userId,
      tenant_id: tenantId,
    };
  }

  return {
    ok: true as const,
    sb: supabaseUser(ctx.accessToken),
    admin: supabaseAdmin(),
    user: ctx.user,
    user_id: ctx.userId,
    tenant_id: ctx.tenantId ?? null,
  };
}

export async function requireTenantAdmin(
  sb: ReturnType<typeof supabaseUser>,
  tenant_id: string,
  user_id: string
) {
  return requireTenantCapability(sb, tenant_id, user_id, "manage_members");
}

export async function getTenantMembership(
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
    console.error("Tenant membership lookup error", { error: error.message, tenantId: tenant_id, userId: user_id });
    return { ok: false as const, error: "Une erreur est survenue." };
  }

  if (!data) {
    return { ok: false as const, error: "Acces refuse." };
  }

  const rawRole = String((data as { role?: unknown }).role ?? "").trim() || null;
  const role = normalizeTenantRole(rawRole);

  return { ok: true as const, role, rawRole };
}

export async function requireTenantCapability(
  sb: ReturnType<typeof supabaseUser>,
  tenant_id: string,
  user_id: string,
  capability: TenantCapability
) {
  const membership = await getTenantMembership(sb, tenant_id, user_id);
  if (!membership.ok) return membership;

  if (!hasTenantCapability(membership.role, capability)) {
    return { ok: false as const, error: "Acces refuse.", role: membership.role };
  }

  return {
    ok: true as const,
    role: membership.role,
    rawRole: membership.rawRole,
  };
}

export async function requireTenantAccess(capability?: TenantCapability) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx;

  if (!capability) {
    return ctx;
  }

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, capability);
  if (!permission.ok) {
    return {
      ok: false as const,
      res: jsonError(permission.error, permission.error === "Acces refuse." ? 403 : 500),
    };
  }

  return {
    ...ctx,
    ok: true as const,
    membership_role: permission.role,
    membership_raw_role: permission.rawRole,
  };
}

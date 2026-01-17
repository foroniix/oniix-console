import { NextResponse } from "next/server";
import { requireAuth } from "../_utils/auth";
import { supabaseUser, supabaseAdmin } from "../_utils/supabase";

export function jsonError(message: string, status = 400) {
  const safeMessage =
    status === 401
      ? "Votre session a expiré. Veuillez vous reconnecter."
      : status === 403
        ? "Accès refusé."
        : message;
  return NextResponse.json({ ok: false, error: safeMessage }, { status });
}

export async function getTenantContext() {
  const auth = await requireAuth();
  if ("res" in auth) return { ok: false as const, res: auth.res };
  const { ctx } = auth;

  return {
    ok: true as const,
    sb: supabaseUser(ctx.accessToken),
    admin: supabaseAdmin(),
    user: ctx.user,
    tenant_id: ctx.tenantId,
  };
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

  if (error) return { ok: false as const, error: error.message };
  const role = (data as any)?.role as string | undefined;

  if (!role || (role !== "owner" && role !== "admin")) {
    return { ok: false as const, error: "Accès refusé." };
  }

  return { ok: true as const, role };
}

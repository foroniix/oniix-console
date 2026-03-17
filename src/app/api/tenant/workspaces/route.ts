import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeTenantRole } from "@/lib/tenant-roles";

import { REFRESH_COOKIE, requireAuth } from "../../_utils/auth";
import { setAuthCookies } from "../../_utils/cookies";
import { supabaseAdmin, supabaseAnon } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MembershipRow = {
  tenant_id: string;
  role: string | null;
  created_at: string | null;
};

type TenantRow = {
  id: string;
  name: string | null;
};

function jsonError(message: string, status = 400) {
  const safeMessage =
    status === 401
      ? "Votre session a expire. Veuillez vous reconnecter."
      : status === 403
        ? "Acces refuse."
        : message;
  return NextResponse.json({ ok: false, error: safeMessage }, { status });
}

async function loadMemberships(userId: string) {
  const admin = supabaseAdmin();

  const { data: memberships, error: membershipsError } = await admin
    .from("tenant_memberships")
    .select("tenant_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (membershipsError) {
    console.error("Workspace memberships load error", {
      error: membershipsError.message,
      userId,
    });
    return { ok: false as const, error: "Une erreur est survenue." };
  }

  const rows = (memberships ?? []) as MembershipRow[];
  const tenantIds = rows.map((row) => row.tenant_id).filter(Boolean);

  let tenants: TenantRow[] = [];
  if (tenantIds.length > 0) {
    const { data: tenantRows, error: tenantsError } = await admin
      .from("tenants")
      .select("id, name")
      .in("id", tenantIds);

    if (tenantsError) {
      console.error("Workspace tenants load error", {
        error: tenantsError.message,
        userId,
      });
      return { ok: false as const, error: "Une erreur est survenue." };
    }

    tenants = (tenantRows ?? []) as TenantRow[];
  }

  return {
    ok: true as const,
    memberships: rows,
    tenants,
  };
}

export async function GET() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  const data = await loadMemberships(ctx.userId);
  if (!data.ok) return jsonError(data.error, 500);

  const tenantsById = new Map(
    data.tenants.map((tenant) => [tenant.id, tenant.name?.trim() || "Espace de travail"])
  );

  const workspaces = data.memberships
    .map((membership) => ({
      id: membership.tenant_id,
      name: tenantsById.get(membership.tenant_id) || "Espace de travail",
      role: normalizeTenantRole(membership.role),
      is_active: membership.tenant_id === ctx.tenantId,
      created_at: membership.created_at,
    }))
    .sort((left, right) => {
      if (left.is_active && !right.is_active) return -1;
      if (!left.is_active && right.is_active) return 1;
      return left.name.localeCompare(right.name, "fr");
    });

  return NextResponse.json(
    {
      ok: true,
      active_tenant_id: ctx.tenantId,
      workspaces,
    },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  const parsed = await parseJson(
    req,
    z.object({
      tenant_id: z.string().uuid(),
    })
  );
  if (!parsed.ok) return parsed.res;

  const nextTenantId = parsed.data.tenant_id;
  if (nextTenantId === ctx.tenantId) {
    return NextResponse.json({ ok: true, tenant_id: nextTenantId }, { status: 200 });
  }

  const admin = supabaseAdmin();
  const { data: membership, error: membershipError } = await admin
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("tenant_id", nextTenantId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (membershipError) {
    console.error("Workspace membership switch lookup error", {
      error: membershipError.message,
      userId: ctx.userId,
      tenantId: nextTenantId,
    });
    return jsonError("Une erreur est survenue.", 500);
  }

  if (!membership) {
    return jsonError("Acces refuse.", 403);
  }

  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value?.trim() || "";
  if (!refreshToken) {
    return jsonError("Votre session a expire. Veuillez vous reconnecter.", 401);
  }

  const previousAppMetadata = { ...((ctx.user.app_metadata ?? {}) as Record<string, unknown>) };
  const nextAppMetadata = {
    ...previousAppMetadata,
    tenant_id: nextTenantId,
  };

  const { error: updateError } = await admin.auth.admin.updateUserById(ctx.userId, {
    app_metadata: nextAppMetadata,
  });

  if (updateError) {
    console.error("Workspace switch metadata update error", {
      error: updateError.message,
      userId: ctx.userId,
      tenantId: nextTenantId,
    });
    return jsonError("Une erreur est survenue.", 500);
  }

  const anon = supabaseAnon();
  const { data: refreshData, error: refreshError } = await anon.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (refreshError || !refreshData.session?.access_token || !refreshData.session?.refresh_token) {
    console.error("Workspace switch session refresh error", {
      error: refreshError?.message ?? "missing_session",
      userId: ctx.userId,
      tenantId: nextTenantId,
    });

    const { error: rollbackError } = await admin.auth.admin.updateUserById(ctx.userId, {
      app_metadata: previousAppMetadata,
    });

    if (rollbackError) {
      console.error("Workspace switch rollback error", {
        error: rollbackError.message,
        userId: ctx.userId,
        tenantId: ctx.tenantId,
      });
    }

    return jsonError("Impossible de rafraichir la session courante.", 500);
  }

  const res = NextResponse.json({ ok: true, tenant_id: nextTenantId }, { status: 200 });
  setAuthCookies(res, refreshData.session.access_token, refreshData.session.refresh_token);
  return res;
}

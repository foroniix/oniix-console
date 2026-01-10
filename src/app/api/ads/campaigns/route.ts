import { NextResponse } from "next/server";
import { requireAuth, requireTenant, requireRole } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Roles autorisés à gérer les campagnes
const CAMPAIGNS_RW_ROLES = ["owner", "admin", "tenant_admin", "superadmin"];

export async function GET() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const tenantRes = requireTenant(auth.ctx);
  if (tenantRes) return tenantRes;

  const sb = supabaseUser(auth.ctx.accessToken);

  const { data, error } = await sb
    .from("ad_campaigns")
    .select("id, tenant_id, name, type, priority, active, starts_at, ends_at, created_at, updated_at")
    .eq("tenant_id", auth.ctx.tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, campaigns: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const tenantRes = requireTenant(auth.ctx);
  if (tenantRes) return tenantRes;

  const roleRes = requireRole(auth.ctx, CAMPAIGNS_RW_ROLES);
  if (roleRes) return roleRes;

  const body = await req.json().catch(() => ({}));

  const name = String(body?.name ?? "").trim();
  const type = String(body?.type ?? "HOUSE").trim();
  const priority = Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 50;
  const active = body?.active === false ? false : true;
  const starts_at = body?.starts_at ? String(body.starts_at) : null;
  const ends_at = body?.ends_at ? String(body.ends_at) : null;

  if (!name) {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }

  const sb = supabaseUser(auth.ctx.accessToken);
  const { data, error } = await sb
    .from("ad_campaigns")
    .insert({
      tenant_id: auth.ctx.tenantId,
      name,
      type,
      priority,
      active,
      starts_at,
      ends_at,
      created_by: auth.ctx.userId,
    })
    .select("id, tenant_id, name, type, priority, active, starts_at, ends_at, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, campaign: data }, { status: 201 });
}

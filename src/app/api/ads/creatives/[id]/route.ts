import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenant, requireRole } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CREATIVES_RW_ROLES = ["owner", "admin", "tenant_admin", "superadmin"] as const;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const tRes = requireTenant(auth.ctx);
  if (tRes) return tRes;

  const rRes = requireRole(auth.ctx, CREATIVES_RW_ROLES as unknown as string[]);
  if (rRes) return rRes;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const body = (await request.json().catch(() => null)) as any;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  const sb = supabaseUser(auth.ctx.accessToken);

  // Adapte ces champs si ta table ad_creatives a un schéma différent
  const patch: any = {
    name: body.name,
    type: body.type,
    active: typeof body.active === "boolean" ? body.active : undefined,
    url: body.url ?? undefined,
    mime: body.mime ?? undefined,
    width: typeof body.width === "number" ? body.width : undefined,
    height: typeof body.height === "number" ? body.height : undefined,
    duration_ms: typeof body.duration_ms === "number" ? body.duration_ms : undefined,
    metadata: body.metadata ?? undefined,
  };

  // remove undefined
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  const { data, error } = await sb
    .from("ad_creatives")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", auth.ctx.tenantId)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, creative: data }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const tRes = requireTenant(auth.ctx);
  if (tRes) return tRes;

  const rRes = requireRole(auth.ctx, CREATIVES_RW_ROLES as unknown as string[]);
  if (rRes) return rRes;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const sb = supabaseUser(auth.ctx.accessToken);

  // Soft delete (archived/inactive) — adapte selon ton schéma
  const { error } = await sb
    .from("ad_creatives")
    .update({ status: "ARCHIVED", active: false })
    .eq("id", id)
    .eq("tenant_id", auth.ctx.tenantId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

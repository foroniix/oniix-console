import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenant, requireRole } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CAMPAIGNS_RW_ROLES = ["owner", "admin", "tenant_admin", "superadmin"] as const;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const tRes = requireTenant(auth.ctx);
  if (tRes) return tRes;

  const rRes = requireRole(auth.ctx, CAMPAIGNS_RW_ROLES as unknown as string[]);
  if (rRes) return rRes;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const body = (await request.json().catch(() => null)) as any;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  const sb = supabaseUser(auth.ctx.accessToken);

  const patch: any = {
    name: body.name,
    type: body.type,
    priority: typeof body.priority === "number" ? body.priority : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
    starts_at: body.starts_at ?? undefined,
    ends_at: body.ends_at ?? undefined,
    targeting: body.targeting ?? undefined,
  };

  // remove undefined
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  const { data, error } = await sb
    .from("ad_campaigns")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", auth.ctx.tenantId)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, campaign: data }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const tRes = requireTenant(auth.ctx);
  if (tRes) return tRes;

  const rRes = requireRole(auth.ctx, CAMPAIGNS_RW_ROLES as unknown as string[]);
  if (rRes) return rRes;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const sb = supabaseUser(auth.ctx.accessToken);

  // Soft delete (status archived)
  const { error } = await sb
    .from("ad_campaigns")
    .update({ status: "ARCHIVED", active: false })
    .eq("id", id)
    .eq("tenant_id", auth.ctx.tenantId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

import { NextResponse } from "next/server";
import { requireAuth, requireTenant, requireRole } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADS_RW_ROLES = ["owner", "admin", "tenant_admin", "superadmin"];

type Params = { id: string };

export async function PATCH(req: Request, { params }: { params: Params }) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const tRes = requireTenant(auth.ctx);
  if (tRes) return tRes;
  const rRes = requireRole(auth.ctx, ADS_RW_ROLES);
  if (rRes) return rRes;

  const id = params.id;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as any;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  const patch: any = {
    name: body.name,
    media_type: body.media_type,
    media_url: body.media_url,
    click_url: body.click_url,
    active: typeof body.active === "boolean" ? body.active : undefined,
  };
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  const sb = supabaseUser(auth.ctx.accessToken);
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

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const tRes = requireTenant(auth.ctx);
  if (tRes) return tRes;
  const rRes = requireRole(auth.ctx, ADS_RW_ROLES);
  if (rRes) return rRes;

  const id = params.id;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const sb = supabaseUser(auth.ctx.accessToken);
  const { error } = await sb.from("ad_creatives").delete().eq("id", id).eq("tenant_id", auth.ctx.tenantId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

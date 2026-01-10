import { NextResponse } from "next/server";
import { requireAuth, requireTenant, requireRole } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADS_RW_ROLES = ["owner", "admin", "tenant_admin", "superadmin"];

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const tRes = requireTenant(auth.ctx);
  if (tRes) return tRes;

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign_id");

  const sb = supabaseUser(auth.ctx.accessToken);
  let q = sb
    .from("ad_creatives")
    .select("id, tenant_id, campaign_id, name, media_type, media_url, click_url, active, created_at, updated_at")
    .eq("tenant_id", auth.ctx.tenantId)
    .order("created_at", { ascending: false });

  if (campaignId) q = q.eq("campaign_id", campaignId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, creatives: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const tRes = requireTenant(auth.ctx);
  if (tRes) return tRes;
  const rRes = requireRole(auth.ctx, ADS_RW_ROLES);
  if (rRes) return rRes;

  const body = (await req.json().catch(() => ({}))) as any;
  const campaign_id = body?.campaign_id ? String(body.campaign_id) : null;
  const name = String(body?.name ?? "").trim();
  const media_type = String(body?.media_type ?? "image");
  const media_url = String(body?.media_url ?? "").trim();
  const click_url = body?.click_url ? String(body.click_url).trim() : null;
  const active = body?.active === false ? false : true;

  if (!campaign_id) return NextResponse.json({ ok: false, error: "campaign_id is required" }, { status: 400 });
  if (!name) return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  if (!media_url) return NextResponse.json({ ok: false, error: "media_url is required" }, { status: 400 });

  const sb = supabaseUser(auth.ctx.accessToken);
  const { data, error } = await sb
    .from("ad_creatives")
    .insert({
      tenant_id: auth.ctx.tenantId,
      campaign_id,
      name,
      media_type,
      media_url,
      click_url,
      active,
      created_by: auth.ctx.userId,
    })
    .select("id, tenant_id, campaign_id, name, media_type, media_url, click_url, active, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, creative: data }, { status: 201 });
}

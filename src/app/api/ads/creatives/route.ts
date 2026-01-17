import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant, requireRole } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";
import { parseJson, parseQuery } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADS_RW_ROLES = ["owner", "admin", "tenant_admin", "superadmin"];

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const tRes = await requireTenant(auth.ctx);
  if (tRes) return tRes;

  const query = parseQuery(
    req,
    z.object({
      campaign_id: z.string().optional(),
    })
  );
  if (!query.ok) return query.res;
  const campaignId = query.data.campaign_id ?? null;

  const sb = supabaseUser(auth.ctx.accessToken);
  let q = sb
    .from("ad_creatives")
    .select("id, tenant_id, campaign_id, name, media_type, media_url, click_url, active, created_at, updated_at")
    .eq("tenant_id", auth.ctx.tenantId)
    .order("created_at", { ascending: false });

  if (campaignId) q = q.eq("campaign_id", campaignId);

  const { data, error } = await q;
  if (error) {
    console.error("Ad creatives load error", { error: error.message, tenantId: auth.ctx.tenantId });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, creatives: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const tRes = await requireTenant(auth.ctx);
  if (tRes) return tRes;
  const rRes = requireRole(auth.ctx, ADS_RW_ROLES);
  if (rRes) return rRes;

  const parsed = await parseJson(
    req,
    z.object({
      campaign_id: z.string().min(1),
      name: z.string().min(1),
      media_type: z.string().optional(),
      media_url: z.string().min(1),
      click_url: z.string().optional(),
      active: z.boolean().optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;
  const campaign_id = body.campaign_id;
  const name = body.name.trim();
  const media_type = body.media_type ?? "image";
  const media_url = body.media_url.trim();
  const click_url = body.click_url ? body.click_url.trim() : null;
  const active = body.active === false ? false : true;

  if (!campaign_id) return NextResponse.json({ ok: false, error: "Veuillez choisir une campagne." }, { status: 400 });
  if (!name) return NextResponse.json({ ok: false, error: "Nom requis." }, { status: 400 });
  if (!media_url) return NextResponse.json({ ok: false, error: "Media requis." }, { status: 400 });

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

  if (error) {
    console.error("Ad creative create error", { error: error.message, tenantId: auth.ctx.tenantId });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, creative: data }, { status: 201 });
}

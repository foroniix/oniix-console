import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pickWeighted<T extends { weight: number }>(items: T[]) {
  const sum = items.reduce((a, b) => a + (b.weight || 1), 0);
  let r = Math.random() * (sum || 1);
  for (const it of items) {
    r -= (it.weight || 1);
    if (r <= 0) return it;
  }
  return items[0];
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const ctx = auth.ctx;
  const tenantRes = requireTenant(ctx);
  if (tenantRes) return tenantRes;

  const url = new URL(req.url);
  const channel_id = url.searchParams.get("channel_id")?.trim() || null;
  const stream_id = url.searchParams.get("stream_id")?.trim() || null;

  const tenant_id = (ctx as any).tenantId || (ctx as any).tenant_id || (ctx as any).tenantID;
  if (!tenant_id) return NextResponse.json({ ok: false, error: "Missing tenant_id" }, { status: 401 });

  const sb = supabaseUser(ctx.accessToken);

  // Minimal schema assumptions:
  // ad_campaigns: id, tenant_id, name, status, priority, channel_id(nullable), stream_id(nullable)
  // ad_creatives: id, tenant_id, campaign_id, media_url, click_url, weight, active
  // If you don't have ad_creatives yet, I can adapt to your current schema.

  let cq = sb
    .from("ad_campaigns")
    .select("id,name,priority,status,channel_id,stream_id")
    .eq("tenant_id", tenant_id)
    .eq("status", "active")
    .order("priority", { ascending: false })
    .limit(20);

  if (stream_id) cq = cq.or(`stream_id.eq.${stream_id},stream_id.is.null`);
  if (!stream_id && channel_id) cq = cq.or(`channel_id.eq.${channel_id},channel_id.is.null`);

  const { data: campaigns, error: cErr } = await cq;
  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 400 });

  const list = campaigns ?? [];
  if (list.length === 0) {
    return NextResponse.json({ ok: true, ad: null }, { status: 200 });
  }

  // take the top priority bucket
  const topPriority = Number((list[0] as any).priority ?? 0);
  const top = list.filter((c) => Number((c as any).priority ?? 0) === topPriority);
  const pickedCampaign = top[Math.floor(Math.random() * top.length)];

  const { data: creatives, error: crErr } = await sb
    .from("ad_creatives")
    .select("id,campaign_id,media_url,click_url,weight,active")
    .eq("tenant_id", tenant_id)
    .eq("campaign_id", (pickedCampaign as any).id)
    .eq("active", true)
    .limit(50);

  if (crErr) return NextResponse.json({ ok: false, error: crErr.message }, { status: 400 });

  const cr = creatives ?? [];
  if (cr.length === 0) return NextResponse.json({ ok: true, ad: null }, { status: 200 });

  const chosen = pickWeighted(cr.map((x: any) => ({ ...x, weight: Number(x.weight ?? 1) })));

  return NextResponse.json(
    {
      ok: true,
      ad: {
        request_id: crypto.randomUUID(),
        tenant_id,
        channel_id,
        stream_id,
        campaign: { id: (pickedCampaign as any).id, name: (pickedCampaign as any).name },
        creative: {
          id: chosen.id,
          media_url: chosen.media_url,
          click_url: chosen.click_url,
        },
      },
    },
    { status: 200 }
  );
}

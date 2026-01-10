import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Bucket = "minute" | "hour";

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function startOfBucket(d: Date, bucket: Bucket) {
  const dd = new Date(d);
  dd.setSeconds(0, 0);
  if (bucket === "hour") dd.setMinutes(0, 0, 0);
  return dd;
}

function keyForBucket(d: Date, bucket: Bucket) {
  const dd = startOfBucket(d, bucket);
  if (bucket === "hour") {
    const y = dd.getUTCFullYear();
    const m = String(dd.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dd.getUTCDate()).padStart(2, "0");
    const h = String(dd.getUTCHours()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:00`;
  } else {
    const y = dd.getUTCFullYear();
    const m = String(dd.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dd.getUTCDate()).padStart(2, "0");
    const h = String(dd.getUTCHours()).padStart(2, "0");
    const min = String(dd.getUTCMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:${min}`;
  }
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const ctx = auth.ctx;
  const tenantRes = requireTenant(ctx);
  if (tenantRes) return tenantRes;

  const url = new URL(req.url);
  const hours = clamp(Number(url.searchParams.get("hours") ?? "24"), 1, 168);
  const bucket = (url.searchParams.get("bucket") === "minute" ? "minute" : "hour") as Bucket;

  const channelId = url.searchParams.get("channelId")?.trim() || null;
  const streamId = url.searchParams.get("streamId")?.trim() || null;

  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const sb = supabaseUser(ctx.accessToken);

  const tenant_id = (ctx as any).tenantId || (ctx as any).tenant_id || (ctx as any).tenantID;
  if (!tenant_id) return NextResponse.json({ ok: false, error: "Missing tenant_id" }, { status: 401 });

  let q = sb
    .from("ad_events")
    .select("id,event,campaign_id,created_at,channel_id,stream_id")
    .eq("tenant_id", tenant_id)
    .gte("created_at", since);

  if (channelId) q = q.eq("channel_id", channelId);
  if (streamId) q = q.eq("stream_id", streamId);

  const { data: events, error } = await q.order("created_at", { ascending: false }).limit(5000);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const list = events ?? [];

  let impressions = 0;
  let clicks = 0;

  const seriesMap = new Map<string, { time: string; impressions: number; clicks: number }>();
  const campMap = new Map<string, { campaign_id: string; impressions: number; clicks: number }>();

  for (const e of list) {
    const ev = String((e as any).event);
    const campId = (e as any).campaign_id ? String((e as any).campaign_id) : null;
    const t = (e as any).created_at ? new Date((e as any).created_at) : null;

    if (ev === "IMPRESSION") impressions += 1;
    if (ev === "CLICK") clicks += 1;

    if (t) {
      const key = keyForBucket(t, bucket);
      if (!seriesMap.has(key)) seriesMap.set(key, { time: key, impressions: 0, clicks: 0 });
      const row = seriesMap.get(key)!;
      if (ev === "IMPRESSION") row.impressions += 1;
      if (ev === "CLICK") row.clicks += 1;
    }

    if (campId) {
      if (!campMap.has(campId)) campMap.set(campId, { campaign_id: campId, impressions: 0, clicks: 0 });
      const c = campMap.get(campId)!;
      if (ev === "IMPRESSION") c.impressions += 1;
      if (ev === "CLICK") c.clicks += 1;
    }
  }

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  const campaignIds = Array.from(campMap.keys());
  const namesById = new Map<string, { name: string; type: string; priority: number }>();

  if (campaignIds.length > 0) {
    const { data: camps } = await sb
      .from("ad_campaigns")
      .select("id,name,type,priority")
      .in("id", campaignIds)
      .limit(500);

    for (const c of camps ?? []) {
      namesById.set(String((c as any).id), {
        name: String((c as any).name ?? "Campaign"),
        type: String((c as any).type ?? "unknown"),
        priority: Number((c as any).priority ?? 0),
      });
    }
  }

  const topCampaigns = Array.from(campMap.values())
    .map((c) => {
      const meta = namesById.get(c.campaign_id);
      const cCtr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
      return {
        campaign_id: c.campaign_id,
        name: meta?.name ?? "Campaign",
        type: meta?.type ?? "unknown",
        priority: meta?.priority ?? 0,
        impressions: c.impressions,
        clicks: c.clicks,
        ctr: cCtr,
      };
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 8);

  const timeseries = Array.from(seriesMap.values()).sort((a, b) => (a.time > b.time ? 1 : -1));

  return NextResponse.json(
    {
      ok: true,
      window_hours: hours,
      bucket,
      since,
      filter: { channelId, streamId },
      kpi: { impressions, clicks, ctr },
      timeseries,
      topCampaigns,
    },
    { status: 200 }
  );
}

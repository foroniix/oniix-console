import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTenantAccess } from "../../tenant/_utils";
import { parseQuery } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const QUERY_SCHEMA = z.object({
  channelId: z.string().optional(),
  streamId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  windowSec: z.coerce.number().int().min(30).max(1800).optional(),
});

type AdEventRow = {
  id: string;
  event: "IMPRESSION" | "CLICK" | "START" | "COMPLETE" | "SKIP";
  campaign_id: string | null;
  creative_id: string | null;
  channel_id: string | null;
  stream_id: string | null;
  created_at: string;
};

export async function GET(req: Request) {
  const ctx = await requireTenantAccess("view_analytics");
  if (!ctx.ok) return ctx.res;

  const query = parseQuery(req, QUERY_SCHEMA);
  if (!query.ok) return query.res;

  const tenantId = ctx.tenant_id;
  const limit = query.data.limit ?? 20;
  const windowSec = query.data.windowSec ?? 300;
  const channelId = query.data.channelId?.trim() || null;
  const streamId = query.data.streamId?.trim() || null;
  const since = new Date(Date.now() - windowSec * 1000).toISOString();

  const sb = ctx.sb;

  let eventsQuery = sb
    .from("ad_events")
    .select("id,event,campaign_id,creative_id,channel_id,stream_id,created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  let impressionsQuery = sb
    .from("ad_events")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("event", "IMPRESSION")
    .gte("created_at", since);

  let clicksQuery = sb
    .from("ad_events")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("event", "CLICK")
    .gte("created_at", since);

  if (channelId) {
    eventsQuery = eventsQuery.eq("channel_id", channelId);
    impressionsQuery = impressionsQuery.eq("channel_id", channelId);
    clicksQuery = clicksQuery.eq("channel_id", channelId);
  }

  if (streamId) {
    eventsQuery = eventsQuery.eq("stream_id", streamId);
    impressionsQuery = impressionsQuery.eq("stream_id", streamId);
    clicksQuery = clicksQuery.eq("stream_id", streamId);
  }

  const [eventsRes, impressionsRes, clicksRes] = await Promise.all([
    eventsQuery,
    impressionsQuery,
    clicksQuery,
  ]);

  if (eventsRes.error || impressionsRes.error || clicksRes.error) {
    console.error("Ads live error", {
      tenantId,
      eventsError: eventsRes.error?.message,
      impressionsError: impressionsRes.error?.message,
      clicksError: clicksRes.error?.message,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }

  const events = ((eventsRes.data ?? []) as AdEventRow[]).map((row) => ({
    id: row.id,
    event: row.event,
    campaign_id: row.campaign_id,
    creative_id: row.creative_id,
    channel_id: row.channel_id,
    stream_id: row.stream_id,
    created_at: row.created_at,
  }));

  return NextResponse.json(
    {
      ok: true,
      windowSec,
      counters: {
        impressions: Number(impressionsRes.count ?? 0),
        clicks: Number(clicksRes.count ?? 0),
        lastEventAt: events[0]?.created_at ?? null,
      },
      events,
    },
    { status: 200 }
  );
}

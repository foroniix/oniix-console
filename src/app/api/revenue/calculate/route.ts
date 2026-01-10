import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const supa = supabaseUser(ctx.accessToken);
    const { searchParams } = new URL(req.url);

    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const now = new Date();
    const start = startParam ? new Date(startParam) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endParam ? new Date(endParam) : new Date();

    const { count: subCount, error: subError } = await supa
      .from("celtiis_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "active")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (subError) throw subError;

    const totalSubs = subCount || 0;
    const totalRevenue = totalSubs * 125;

    const telcoShare = totalRevenue * 0.6;
    const platformShare = totalRevenue * 0.2;
    const contentPool = totalRevenue * 0.2;

    const { data: events, error: evtError } = await supa
      .from("analytics_events")
      .select("stream_id")
      .eq("tenant_id", ctx.tenantId)
      .eq("event_type", "HEARTBEAT")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (evtError) throw evtError;

    const streamStats = new Map<string, number>();
    let totalHeartbeats = 0;

    events?.forEach((ev: any) => {
      if (ev.stream_id) {
        streamStats.set(ev.stream_id, (streamStats.get(ev.stream_id) || 0) + 1);
        totalHeartbeats++;
      }
    });

    const ids = Array.from(streamStats.keys());
    const { data: streams, error: streamError } = ids.length
      ? await supa
          .from("streams")
          .select(
            `
        id, 
        title, 
        channel_id,
        channel:channels (
          name,
          logo
        )
      `
          )
          .eq("tenant_id", ctx.tenantId)
          .in("id", ids)
      : { data: [], error: null };

    if (streamError) throw streamError;

    const payouts =
      streams?.map((stream: any) => {
        const beats = streamStats.get(stream.id) || 0;
        const sharePercent = totalHeartbeats > 0 ? beats / totalHeartbeats : 0;
        const channelInfo = Array.isArray(stream.channel) ? stream.channel[0] : stream.channel;

        return {
          streamId: stream.id,
          channelId: stream.channel_id,
          channelName: channelInfo?.name || stream.title,
          channelLogo: channelInfo?.logo,
          watchTimeMinutes: Math.round((beats * 30) / 60),
          sharePercent: (sharePercent * 100).toFixed(2),
          earnings: Math.round(contentPool * sharePercent),
        };
      }).sort((a: any, b: any) => b.earnings - a.earnings) || [];

    return NextResponse.json({
      period: { start: start.toISOString(), end: end.toISOString() },
      financials: { totalSubs, totalRevenue, telcoShare, platformShare, contentPool, currency: "FCFA" },
      payouts,
    });
  } catch (err: any) {
    console.error("Critical API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

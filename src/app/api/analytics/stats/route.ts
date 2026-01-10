// src/app/api/analytics/stats/route.ts (multi-tenant)
import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AnalyticsEvent {
  created_at: string;
  device_type: string | null;
  stream_id: string | null;
  session_id: string;
  event_type: string;
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "24h";

    const supa = supabaseUser(ctx.accessToken);
    const now = new Date();
    const startTime = new Date();

    if (period === "24h") startTime.setHours(now.getHours() - 24);
    else if (period === "7d") startTime.setDate(now.getDate() - 7);
    else if (period === "30d") startTime.setDate(now.getDate() - 30);

    const liveThreshold = new Date(Date.now() - 30 * 1000).toISOString();

    const [historicalRes, liveRes] = await Promise.all([
      supa
        .from("analytics_events")
        .select("created_at, device_type, stream_id, session_id, event_type")
        .eq("tenant_id", ctx.tenantId)
        .gte("created_at", startTime.toISOString())
        .order("created_at", { ascending: true }),
      supa
        .from("analytics_events")
        .select("session_id")
        .eq("tenant_id", ctx.tenantId)
        .gte("created_at", liveThreshold),
    ]);

    if (historicalRes.error) throw new Error(historicalRes.error.message);
    if (liveRes.error) throw new Error(liveRes.error.message);

    const events = (historicalRes.data || []) as AnalyticsEvent[];
    const liveEvents = (liveRes.data || []) as Partial<AnalyticsEvent>[];

    const uniqueSessions = new Set(events.map((e) => e.session_id));
    const activeUsersNow = new Set(liveEvents.map((e) => e.session_id)).size;

    const heartbeats = events.filter((e) => e.event_type === "HEARTBEAT").length;
    const totalMinutes = Math.round((heartbeats * 30) / 60);
    const watchTimeStr =
      totalMinutes > 60
        ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
        : `${totalMinutes}m`;

    const sessionActivity: Record<string, number> = {};
    events.forEach((e) => {
      sessionActivity[e.session_id] = (sessionActivity[e.session_id] || 0) + 1;
    });
    const retainedUsers = Object.values(sessionActivity).filter((count) => count > 5).length;
    const retentionRate = uniqueSessions.size > 0 ? Math.round((retainedUsers / uniqueSessions.size) * 100) : 0;

    const trafficMap = new Map<string, number>();
    events.forEach((ev) => {
      const date = new Date(ev.created_at);
      let key = "";
      if (period === "24h") {
        key = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).split(":")[0] + ":00";
      } else {
        key = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      }
      trafficMap.set(key, (trafficMap.get(key) || 0) + 1);
    });

    const traffic = Array.from(trafficMap.entries()).map(([time, viewers]) => ({ time, viewers }));

    const deviceCounts: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0 };
    events.forEach((e) => {
      let type = "Desktop";
      const dbType = e.device_type?.toLowerCase() || "";
      if (dbType.includes("mobile") || dbType.includes("android") || dbType.includes("iphone")) type = "Mobile";
      else if (dbType.includes("tablet") || dbType.includes("ipad")) type = "Tablet";
      deviceCounts[type]++;
    });

    const totalDeviceEvents = Object.values(deviceCounts).reduce((a, b) => a + b, 0);
    const devices = [
      { name: "Mobile", value: totalDeviceEvents ? Math.round((deviceCounts["Mobile"] / totalDeviceEvents) * 100) : 0 },
      { name: "Desktop", value: totalDeviceEvents ? Math.round((deviceCounts["Desktop"] / totalDeviceEvents) * 100) : 0 },
      { name: "Tablet", value: totalDeviceEvents ? Math.round((deviceCounts["Tablet"] / totalDeviceEvents) * 100) : 0 },
    ].filter((d) => d.value > 0);

    const recentEvents = events
      .slice(-15)
      .reverse()
      .map((e) => {
        let message = "Interaction détectée";
        if (e.event_type === "START_STREAM") message = "Nouveau visionnage";
        else if (e.event_type === "HEARTBEAT") message = "Spectateur actif";
        else if (e.event_type === "ERROR") message = "Erreur de lecture";
        return {
          message,
          time: new Date(e.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        };
      });

    return NextResponse.json({
      traffic,
      devices,
      kpi: { users: uniqueSessions.size, events: events.length, watchTime: watchTimeStr, retention: retentionRate },
      recentEvents,
      live: { activeUsers: activeUsersNow },
    });
  } catch (error: any) {
    console.error("API Analytics Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

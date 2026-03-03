// src/app/api/analytics/stats/route.ts (multi-tenant)
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseQuery } from "../../_utils/validate";
import { resolveAnalyticsStreamFilter } from "../../_utils/analytics-stream-filter";
import { getStreamStatsLiveFallback } from "../../_utils/stream-stats-live-fallback";
import {
  buildLiveSnapshotFromEvents,
  getViewerLiveSnapshot,
  type ViewerLiveEventRow,
} from "../../_utils/viewer-live";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const HEARTBEAT_SECONDS = 15;
const LIVE_WINDOW_SEC = 35;

interface AnalyticsEvent {
  created_at: string;
  device_type: string | null;
  stream_id: string | null;
  session_id: string;
  event_type: string;
}

function normalizeEventType(eventType: string | null | undefined) {
  return (eventType ?? "").trim().toUpperCase();
}

function buildEmptyResponse() {
  return {
    traffic: [] as { time: string; viewers: number }[],
    devices: [] as { name: string; value: number }[],
    kpi: {
      totalUsers: 0,
      totalEvents: 0,
      watchTime: 0,
      users: 0,
      events: 0,
      watchTimeLabel: "0m",
      retention: 0,
    },
    recentEvents: [] as { message: string; time: string }[],
    live: { activeUsers: 0, currentStreams: {} as Record<string, number> },
  };
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const query = parseQuery(
      req,
      z.object({
        period: z.string().optional(),
        channelId: z.string().optional(),
        streamId: z.string().optional(),
      })
    );
    if (!query.ok) return query.res;
    const period = query.data.period || "24h";

    const supa = supabaseAdmin();
    const now = new Date();
    const startTime = new Date();

    if (period === "24h") startTime.setHours(now.getHours() - 24);
    else if (period === "7d") startTime.setDate(now.getDate() - 7);
    else if (period === "30d") startTime.setDate(now.getDate() - 30);

    const filterRes = await resolveAnalyticsStreamFilter(supa, {
      tenantId: ctx.tenantId,
      channelId: query.data.channelId ?? null,
      streamId: query.data.streamId ?? null,
    });
    if (!filterRes.ok) {
      console.error("Analytics stats filter error", {
        error: filterRes.error,
        code: filterRes.code ?? null,
        tenantId: ctx.tenantId,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    const streamFilter = filterRes.filter;
    const streamIdsForFilter =
      streamFilter.mode === "none" ? [] : streamFilter.mode === "ids" ? streamFilter.streamIds : undefined;

    if (streamFilter.mode === "none") {
      const liveSnapshotRes = await getViewerLiveSnapshot(supa, {
        tenantId: ctx.tenantId,
        windowSec: LIVE_WINDOW_SEC,
        expireStale: true,
        streamIds: [],
      });
      const payload = buildEmptyResponse();
      if (liveSnapshotRes.ok) {
        payload.live = {
          activeUsers: liveSnapshotRes.snapshot.activeUsers,
          currentStreams: liveSnapshotRes.snapshot.currentStreams,
        };
      }
      return NextResponse.json(payload);
    }

    const liveThreshold = new Date(Date.now() - LIVE_WINDOW_SEC * 1000).toISOString();

    let historicalQuery = supa
      .from("analytics_events")
      .select("created_at, device_type, stream_id, session_id, event_type")
      .eq("tenant_id", ctx.tenantId)
      .gte("created_at", startTime.toISOString());

    let liveQuery = supa
      .from("analytics_events")
      .select("created_at, session_id, stream_id, event_type")
      .eq("tenant_id", ctx.tenantId)
      .gte("created_at", liveThreshold);

    if (streamFilter.mode === "ids" && streamFilter.streamIds.length === 1) {
      historicalQuery = historicalQuery.eq("stream_id", streamFilter.streamIds[0]);
      liveQuery = liveQuery.eq("stream_id", streamFilter.streamIds[0]);
    } else if (streamFilter.mode === "ids" && streamFilter.streamIds.length > 1) {
      historicalQuery = historicalQuery.in("stream_id", streamFilter.streamIds);
      liveQuery = liveQuery.in("stream_id", streamFilter.streamIds);
    }

    const [historicalRes, liveRes, liveSnapshotRes] = await Promise.all([
      historicalQuery.order("created_at", { ascending: true }),
      liveQuery.order("created_at", { ascending: true }),
      getViewerLiveSnapshot(supa, {
        tenantId: ctx.tenantId,
        windowSec: LIVE_WINDOW_SEC,
        expireStale: true,
        streamIds: streamIdsForFilter,
      }),
    ]);

    if (historicalRes.error || liveRes.error) {
      console.error("Analytics stats error", {
        historical: historicalRes.error?.message,
        live: liveRes.error?.message,
        tenantId: ctx.tenantId,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }

    const events = (historicalRes.data || []) as AnalyticsEvent[];
    const liveEvents = (liveRes.data || []) as ViewerLiveEventRow[];
    const fallbackLiveSnapshot = buildLiveSnapshotFromEvents(liveEvents, {
      windowSec: LIVE_WINDOW_SEC,
    });
    const liveSnapshot = liveSnapshotRes.ok ? liveSnapshotRes.snapshot : fallbackLiveSnapshot;
    if (!liveSnapshotRes.ok && !liveSnapshotRes.tableMissing) {
      console.error("Analytics stats live snapshot error", {
        error: liveSnapshotRes.error ?? "unknown",
        code: liveSnapshotRes.code ?? null,
        tenantId: ctx.tenantId,
      });
    }

    const uniqueSessions = new Set(events.map((e) => e.session_id));
    let activeUsersNow = liveSnapshot.activeUsers;
    let currentStreams = liveSnapshot.currentStreams;

    if (streamFilter.mode !== "none" && activeUsersNow === 0) {
      const streamStatsFallback = await getStreamStatsLiveFallback(supa, {
        tenantId: ctx.tenantId,
        windowSec: LIVE_WINDOW_SEC,
        streamIds: streamIdsForFilter,
      });
      if (streamStatsFallback.ok) {
        activeUsersNow = streamStatsFallback.snapshot.activeUsers;
        currentStreams = streamStatsFallback.snapshot.currentStreams;
      } else {
        console.error("Analytics stats stream_stats fallback error", {
          error: streamStatsFallback.error,
          code: streamStatsFallback.code ?? null,
          tenantId: ctx.tenantId,
        });
      }
    }

    const heartbeats = events.filter((e) => normalizeEventType(e.event_type) === "HEARTBEAT").length;
    const totalMinutes = Math.round((heartbeats * HEARTBEAT_SECONDS) / 60);
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
        const normalizedType = normalizeEventType(e.event_type);
        if (normalizedType === "START_STREAM") message = "Nouveau visionnage";
        else if (normalizedType === "HEARTBEAT") message = "Spectateur actif";
        else if (normalizedType === "ERROR") message = "Erreur de lecture";
        return {
          message,
          time: new Date(e.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        };
      });

    return NextResponse.json({
      traffic,
      devices,
      kpi: {
        totalUsers: uniqueSessions.size,
        totalEvents: events.length,
        watchTime: totalMinutes,
        users: uniqueSessions.size,
        events: events.length,
        watchTimeLabel: watchTimeStr,
        retention: retentionRate,
      },
      recentEvents,
      live: { activeUsers: activeUsersNow, currentStreams },
    });
  } catch (error: unknown) {
    console.error("API Analytics Error:", error);
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}

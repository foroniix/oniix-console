import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildPlatformDistribution,
  buildPlaybackOnlyRecentEvents,
  buildTrafficSourceTimestamps,
  buildUnifiedAnalyticsSessions,
  countPlaybackOnlySessions,
  formatWatchDurationSeconds,
} from "../../_utils/analytics-summary";
import {
  buildPlaybackCurrentStreams,
  getPreferredStreamsByChannel,
  listActivePlaybackSessions,
  listPlaybackSessionsSince,
  resolvePlaybackChannelIds,
} from "../../_utils/playback-session-fallback";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseQuery } from "../../_utils/validate";
import { resolveAnalyticsStreamFilter } from "../../_utils/analytics-stream-filter";
import { getStreamStatsLiveFallback } from "../../_utils/stream-stats-live-fallback";
import { requireTenantAccess } from "../../tenant/_utils";
import {
  buildLiveSnapshotFromEvents,
  getViewerLiveSnapshot,
  type ViewerLiveEventRow,
} from "../../_utils/viewer-live";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIVE_WINDOW_SEC = 35;
const RETENTION_THRESHOLD_SECONDS = 75;

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

function buildTrafficBuckets(values: string[], period: string) {
  const buckets = new Map<string, number>();

  values.forEach((value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;

    const key =
      period === "24h"
        ? `${date.toLocaleTimeString("fr-FR", { hour: "2-digit" }).split(":")[0]}:00`
        : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

    buckets.set(key, (buckets.get(key) || 0) + 1);
  });

  return Array.from(buckets.entries()).map(([time, viewers]) => ({ time, viewers }));
}

function buildDeviceDistribution(deviceNames: string[]) {
  const counts: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0 };

  deviceNames.forEach((value) => {
    const normalized = value.toLowerCase();
    let bucket = "Desktop";
    if (normalized.includes("mobile") || normalized.includes("android") || normalized.includes("iphone")) {
      bucket = "Mobile";
    } else if (normalized.includes("tablet") || normalized.includes("ipad")) {
      bucket = "Tablet";
    }
    counts[bucket] += 1;
  });

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return [
    { name: "Mobile", value: total ? Math.round((counts["Mobile"] / total) * 100) : 0 },
    { name: "Desktop", value: total ? Math.round((counts["Desktop"] / total) * 100) : 0 },
    { name: "Tablet", value: total ? Math.round((counts["Tablet"] / total) * 100) : 0 },
  ].filter((entry) => entry.value > 0);
}

export async function GET(req: Request) {
  const ctx = await requireTenantAccess("view_analytics");
  if (!ctx.ok) return ctx.res;

  const tenantId = ctx.tenant_id;

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
    const periodEndIso = now.toISOString();

    if (period === "24h") startTime.setHours(now.getHours() - 24);
    else if (period === "7d") startTime.setDate(now.getDate() - 7);
    else if (period === "30d") startTime.setDate(now.getDate() - 30);

    const liveThreshold = new Date(Date.now() - LIVE_WINDOW_SEC * 1000).toISOString();

    const filterRes = await resolveAnalyticsStreamFilter(supa, {
      tenantId,
      channelId: query.data.channelId ?? null,
      streamId: query.data.streamId ?? null,
    });
    if (!filterRes.ok) {
      console.error("Analytics stats filter error", {
        error: filterRes.error,
        code: filterRes.code ?? null,
        tenantId,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }

    const streamFilter = filterRes.filter;
    const streamIdsForFilter =
      streamFilter.mode === "none" ? [] : streamFilter.mode === "ids" ? streamFilter.streamIds : undefined;

    const playbackChannelIdsRes = await resolvePlaybackChannelIds(supa, {
      tenantId,
      channelId: query.data.channelId ?? null,
      streamIds: streamFilter.mode === "ids" ? streamFilter.streamIds : null,
    });
    if (!playbackChannelIdsRes.ok) {
      console.error("Analytics stats playback filter error", {
        error: playbackChannelIdsRes.error,
        code: playbackChannelIdsRes.code ?? null,
        tenantId,
      });
    }

    const getPlaybackLiveFallback = async () => {
      if (!playbackChannelIdsRes.ok) return null;

      const playbackRes = await listActivePlaybackSessions(supa, {
        tenantId,
        sinceIso: liveThreshold,
        channelIds: playbackChannelIdsRes.data,
      });
      if (!playbackRes.ok) {
        console.error("Analytics stats playback live fallback error", {
          error: playbackRes.error,
          code: playbackRes.code ?? null,
          tenantId,
        });
        return null;
      }

      const channelIds = Array.from(new Set(playbackRes.data.map((row) => row.channel_id)));
      const preferredStreamsRes = await getPreferredStreamsByChannel(supa, {
        tenantId,
        channelIds,
      });
      if (!preferredStreamsRes.ok) {
        console.error("Analytics stats playback stream mapping error", {
          error: preferredStreamsRes.error,
          code: preferredStreamsRes.code ?? null,
          tenantId,
        });
      }

      return {
        activeUsers: playbackRes.data.length,
        currentStreams: buildPlaybackCurrentStreams(playbackRes.data, {
          channelToStreamId: preferredStreamsRes.ok ? preferredStreamsRes.data : new Map(),
          streamIdOverride: query.data.streamId ?? null,
        }),
      };
    };

    const getPlaybackHistoryFallback = async () => {
      if (!playbackChannelIdsRes.ok) return [];

      const playbackRes = await listPlaybackSessionsSince(supa, {
        tenantId,
        sinceIso: startTime.toISOString(),
        untilIso: periodEndIso,
        channelIds: playbackChannelIdsRes.data,
      });
      if (!playbackRes.ok) {
        console.error("Analytics stats playback history fallback error", {
          error: playbackRes.error,
          code: playbackRes.code ?? null,
          tenantId,
        });
        return [];
      }

      return playbackRes.data;
    };

    let historicalQuery = supa
      .from("analytics_events")
      .select("created_at, device_type, stream_id, session_id, event_type")
      .eq("tenant_id", tenantId)
      .gte("created_at", startTime.toISOString());

    let liveQuery = supa
      .from("analytics_events")
      .select("created_at, session_id, stream_id, event_type")
      .eq("tenant_id", tenantId)
      .gte("created_at", liveThreshold);

    if (streamFilter.mode === "ids" && streamFilter.streamIds.length === 1) {
      historicalQuery = historicalQuery.eq("stream_id", streamFilter.streamIds[0]);
      liveQuery = liveQuery.eq("stream_id", streamFilter.streamIds[0]);
    } else if (streamFilter.mode === "ids" && streamFilter.streamIds.length > 1) {
      historicalQuery = historicalQuery.in("stream_id", streamFilter.streamIds);
      liveQuery = liveQuery.in("stream_id", streamFilter.streamIds);
    } else if (streamFilter.mode === "none") {
      historicalQuery = historicalQuery.eq("stream_id", "__none__");
      liveQuery = liveQuery.eq("stream_id", "__none__");
    }

    const [historicalRes, liveRes, liveSnapshotRes, playbackHistory] = await Promise.all([
      historicalQuery.order("created_at", { ascending: true }),
      liveQuery.order("created_at", { ascending: true }),
      getViewerLiveSnapshot(supa, {
        tenantId,
        windowSec: LIVE_WINDOW_SEC,
        expireStale: true,
        streamIds: streamIdsForFilter,
      }),
      getPlaybackHistoryFallback(),
    ]);

    if (historicalRes.error || liveRes.error) {
      console.error("Analytics stats error", {
        historical: historicalRes.error?.message,
        live: liveRes.error?.message,
        tenantId,
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
        tenantId,
      });
    }

    let activeUsersNow = liveSnapshot.activeUsers;
    let currentStreams = liveSnapshot.currentStreams;

    if (activeUsersNow === 0) {
      const streamStatsFallback = await getStreamStatsLiveFallback(supa, {
        tenantId,
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
          tenantId,
        });
      }

      if (activeUsersNow === 0) {
        const playbackLive = await getPlaybackLiveFallback();
        if (playbackLive) {
          activeUsersNow = playbackLive.activeUsers;
          currentStreams = playbackLive.currentStreams;
        }
      }
    }

    let channelToStreamId = new Map<string, string>();
    if (playbackHistory.length > 0) {
      const preferredStreamsRes = await getPreferredStreamsByChannel(supa, {
        tenantId,
        channelIds: Array.from(new Set(playbackHistory.map((row) => row.channel_id))),
      });
      if (preferredStreamsRes.ok) {
        channelToStreamId = preferredStreamsRes.data;
      } else {
        console.error("Analytics stats playback history stream mapping error", {
          error: preferredStreamsRes.error,
          code: preferredStreamsRes.code ?? null,
          tenantId,
        });
      }
    }

    const unifiedSessions = buildUnifiedAnalyticsSessions({
      events,
      playbackSessions: playbackHistory,
      channelToStreamId,
      streamIdOverride: query.data.streamId ?? null,
      windowStartIso: startTime.toISOString(),
      windowEndIso: periodEndIso,
    });

    const totalWatchSeconds = unifiedSessions.reduce(
      (sum, session) => sum + Math.max(0, session.watchSeconds),
      0
    );
    const totalMinutes = Math.round(totalWatchSeconds / 60);
    const watchTimeStr = formatWatchDurationSeconds(totalWatchSeconds);

    const retentionRate =
      unifiedSessions.length > 0
        ? Math.round(
            (unifiedSessions.filter((session) => session.watchSeconds >= RETENTION_THRESHOLD_SECONDS).length /
              unifiedSessions.length) *
              100
          )
        : 0;

    const traffic = buildTrafficBuckets(
      buildTrafficSourceTimestamps({
        events,
        playbackSessions: playbackHistory,
      }),
      period
    );

    const devices = buildDeviceDistribution(
      unifiedSessions.map((session) => session.deviceType)
    );
    const platforms = buildPlatformDistribution(unifiedSessions);

    const recentEvents = [
      ...events.map((event) => {
        let message = "Interaction detectee";
        const normalizedType = normalizeEventType(event.event_type);
        if (normalizedType === "START_STREAM") message = "Nouveau visionnage";
        else if (normalizedType === "HEARTBEAT") message = "Spectateur actif";
        else if (normalizedType === "ERROR") message = "Erreur de lecture";
        return {
          message,
          created_at: event.created_at,
        };
      }),
      ...buildPlaybackOnlyRecentEvents(events, playbackHistory),
    ]
      .sort((left, right) => {
        const leftMs = Date.parse(left.created_at);
        const rightMs = Date.parse(right.created_at);
        return rightMs - leftMs;
      })
      .slice(0, 15)
      .map((event) => ({
        message: event.message,
        time: new Date(event.created_at).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      }));

    const totalUsers = unifiedSessions.length;
    const totalEvents = events.length + countPlaybackOnlySessions(events, playbackHistory);

    return NextResponse.json({
      traffic,
      devices,
      platforms,
      kpi: {
        totalUsers,
        totalEvents,
        watchTime: totalMinutes,
        watchTimeSeconds: totalWatchSeconds,
        users: totalUsers,
        events: totalEvents,
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

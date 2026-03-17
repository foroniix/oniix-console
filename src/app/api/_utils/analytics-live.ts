import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { resolveAnalyticsStreamFilter } from "./analytics-stream-filter";
import {
  buildPlaybackCurrentStreams,
  buildPlaybackSessionViewRows,
  getPreferredStreamsByChannel,
  listActivePlaybackSessions,
  resolvePlaybackChannelIds,
} from "./playback-session-fallback";
import {
  buildLiveSnapshotFromSessionRows,
  mergeLiveSnapshots,
  type LiveSnapshotSource,
  type MergeableLiveSnapshot,
} from "./live-snapshot-merge";
import { getStreamStatsLiveFallback } from "./stream-stats-live-fallback";
import {
  buildLiveSnapshotFromEvents,
  clampLiveWindowSec,
  type ViewerLiveEventRow,
  type ViewerLiveSessionRow,
  getViewerLiveSnapshot,
} from "./viewer-live";

export const ANALYTICS_LIVE_QUERY_SCHEMA = z.object({
  windowSec: z.string().optional(),
  channelId: z.string().optional(),
  streamId: z.string().optional(),
});

export type AnalyticsLivePayload = {
  ok: true;
  live: {
    activeUsers: number;
    currentStreams: Record<string, number>;
  };
  sessions: ViewerLiveSessionRow[];
  asOf: string;
  windowSec: number;
  source: LiveSnapshotSource | "stream_stats_fallback";
};

type AnalyticsLiveResult =
  | { ok: true; data: AnalyticsLivePayload }
  | { ok: false; status: number; error: string };

type ResolveAnalyticsLiveSnapshotInput = {
  sb: SupabaseClient;
  tenantId: string;
  channelId?: string | null;
  streamId?: string | null;
  windowSec?: string | number | null;
};

export async function resolveAnalyticsLiveSnapshot(
  input: ResolveAnalyticsLiveSnapshotInput
): Promise<AnalyticsLiveResult> {
  const { sb, tenantId } = input;
  const windowSec = clampLiveWindowSec(input.windowSec ?? null);

  const filterRes = await resolveAnalyticsStreamFilter(sb, {
    tenantId,
    channelId: input.channelId ?? null,
    streamId: input.streamId ?? null,
  });
  if (!filterRes.ok) {
    console.error("Analytics live filter error", {
      error: filterRes.error,
      code: filterRes.code ?? null,
      tenantId,
    });
    return { ok: false, status: 500, error: "Une erreur est survenue." };
  }

  const streamFilter = filterRes.filter;
  const streamIdsForFilter =
    streamFilter.mode === "none" ? [] : streamFilter.mode === "ids" ? streamFilter.streamIds : undefined;

  const playbackChannelIdsRes = await resolvePlaybackChannelIds(sb, {
    tenantId,
    channelId: input.channelId ?? null,
    streamIds: streamFilter.mode === "ids" ? streamFilter.streamIds : null,
  });
  if (!playbackChannelIdsRes.ok) {
    console.error("Analytics live playback filter error", {
      error: playbackChannelIdsRes.error,
      code: playbackChannelIdsRes.code ?? null,
      tenantId,
    });
  }

  const getPlaybackSnapshot = async (): Promise<MergeableLiveSnapshot | null> => {
    if (!playbackChannelIdsRes.ok) return null;

    const playbackRes = await listActivePlaybackSessions(sb, {
      tenantId,
      sinceIso: new Date(Date.now() - windowSec * 1000).toISOString(),
      channelIds: playbackChannelIdsRes.data,
    });
    if (!playbackRes.ok) {
      console.error("Analytics live playback session error", {
        error: playbackRes.error,
        code: playbackRes.code ?? null,
        tenantId,
      });
      return null;
    }

    const channelIds = Array.from(new Set(playbackRes.data.map((row) => row.channel_id)));
    const preferredStreamsRes = await getPreferredStreamsByChannel(sb, {
      tenantId,
      channelIds,
    });
    if (!preferredStreamsRes.ok) {
      console.error("Analytics live playback stream mapping error", {
        error: preferredStreamsRes.error,
        code: preferredStreamsRes.code ?? null,
        tenantId,
      });
    }

    const streamIdOverride = input.streamId?.trim() || null;
    const channelToStreamId = preferredStreamsRes.ok ? preferredStreamsRes.data : new Map();
    const sessions = buildPlaybackSessionViewRows(playbackRes.data, {
      channelToStreamId,
      streamIdOverride,
    });

    const snapshot = buildLiveSnapshotFromSessionRows({
      sessions,
      windowSec,
      asOf: new Date().toISOString(),
      source: "playback_sessions",
    });

    const playbackCurrentStreams = buildPlaybackCurrentStreams(playbackRes.data, {
      channelToStreamId,
      streamIdOverride,
    });

    return {
      ...snapshot,
      currentStreams:
        Object.keys(playbackCurrentStreams).length > 0 ? playbackCurrentStreams : snapshot.currentStreams,
    };
  };

  const [liveRes, playbackSnapshot] = await Promise.all([
    getViewerLiveSnapshot(sb, {
      tenantId,
      windowSec,
      expireStale: true,
      streamIds: streamIdsForFilter,
    }),
    getPlaybackSnapshot(),
  ]);

  if (liveRes.ok) {
    const mergedSnapshot = mergeLiveSnapshots({
      primary: liveRes.snapshot,
      playback: playbackSnapshot,
    });

    if (mergedSnapshot.activeUsers === 0 && streamFilter.mode !== "none") {
      const streamStatsFallback = await getStreamStatsLiveFallback(sb, {
        tenantId,
        windowSec,
        streamIds: streamIdsForFilter,
      });

      if (streamStatsFallback.ok && streamStatsFallback.snapshot.activeUsers > 0) {
        return {
          ok: true,
          data: {
            ok: true,
            live: {
              activeUsers: streamStatsFallback.snapshot.activeUsers,
              currentStreams: streamStatsFallback.snapshot.currentStreams,
            },
            sessions: [],
            asOf: streamStatsFallback.snapshot.asOf,
            windowSec: streamStatsFallback.snapshot.windowSec,
            source: streamStatsFallback.snapshot.source,
          },
        };
      }

      if (!streamStatsFallback.ok) {
        console.error("Analytics live stream_stats fallback error", {
          error: streamStatsFallback.error,
          code: streamStatsFallback.code ?? null,
          tenantId,
        });
      }
    }

    return {
      ok: true,
      data: {
        ok: true,
        live: {
          activeUsers: mergedSnapshot.activeUsers,
          currentStreams: mergedSnapshot.currentStreams,
        },
        sessions: mergedSnapshot.sessions,
        asOf: mergedSnapshot.asOf,
        windowSec: mergedSnapshot.windowSec,
        source: mergedSnapshot.source,
      },
    };
  }

  if (!liveRes.tableMissing) {
    console.error("Analytics live snapshot error", {
      error: liveRes.error ?? "unknown",
      code: liveRes.code ?? null,
      tenantId,
    });
    return { ok: false, status: 500, error: "Une erreur est survenue." };
  }

  const liveThreshold = new Date(Date.now() - windowSec * 1000).toISOString();
  let fallbackQuery = sb
    .from("analytics_events")
    .select("created_at, session_id, stream_id, event_type")
    .eq("tenant_id", tenantId)
    .gte("created_at", liveThreshold);

  if (streamFilter.mode === "ids" && streamFilter.streamIds.length === 1) {
    fallbackQuery = fallbackQuery.eq("stream_id", streamFilter.streamIds[0]);
  } else if (streamFilter.mode === "ids" && streamFilter.streamIds.length > 1) {
    fallbackQuery = fallbackQuery.in("stream_id", streamFilter.streamIds);
  } else if (streamFilter.mode === "none") {
    fallbackQuery = fallbackQuery.eq("stream_id", "__none__");
  }

  const fallbackRes = await fallbackQuery.order("created_at", { ascending: true });
  if (fallbackRes.error) {
    console.error("Analytics live fallback error", {
      error: fallbackRes.error.message,
      code: fallbackRes.error.code,
      tenantId,
    });
    return { ok: false, status: 500, error: "Une erreur est survenue." };
  }

  const fallbackSnapshot = buildLiveSnapshotFromEvents(
    (fallbackRes.data ?? []) as ViewerLiveEventRow[],
    { windowSec }
  );

  const mergedFallbackSnapshot = mergeLiveSnapshots({
    primary: fallbackSnapshot,
    playback: playbackSnapshot,
  });

  if (mergedFallbackSnapshot.activeUsers === 0 && streamFilter.mode !== "none") {
    const streamStatsFallback = await getStreamStatsLiveFallback(sb, {
      tenantId,
      windowSec,
      streamIds: streamIdsForFilter,
    });
    if (streamStatsFallback.ok && streamStatsFallback.snapshot.activeUsers > 0) {
      return {
        ok: true,
        data: {
          ok: true,
          live: {
            activeUsers: streamStatsFallback.snapshot.activeUsers,
            currentStreams: streamStatsFallback.snapshot.currentStreams,
          },
          sessions: [],
          asOf: streamStatsFallback.snapshot.asOf,
          windowSec: streamStatsFallback.snapshot.windowSec,
          source: streamStatsFallback.snapshot.source,
        },
      };
    }

    if (!streamStatsFallback.ok) {
      console.error("Analytics live stream_stats fallback error", {
        error: streamStatsFallback.error,
        code: streamStatsFallback.code ?? null,
        tenantId,
      });
    }
  }

  return {
    ok: true,
    data: {
      ok: true,
      live: {
        activeUsers: mergedFallbackSnapshot.activeUsers,
        currentStreams: mergedFallbackSnapshot.currentStreams,
      },
      sessions: mergedFallbackSnapshot.sessions,
      asOf: mergedFallbackSnapshot.asOf,
      windowSec: mergedFallbackSnapshot.windowSec,
      source: mergedFallbackSnapshot.source,
    },
  };
}

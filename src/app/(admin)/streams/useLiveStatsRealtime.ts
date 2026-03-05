import { supabaseBrowser } from "@/lib/supabase/browser";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useRef, useState } from "react";

export type UIStats = {
  viewers: number;
  bitrate: number;
  errors: number;
  fps: number;
  audioLevel: number;
  health: "Excellent" | "Good" | "Unstable" | "Critical";
  formattedBitrate: string;
};

type StreamStatsRow = {
  viewers?: number | null;
  bitrate_kbps?: number | null;
  errors?: number | null;
  fps?: number | null;
  created_at?: string | null;
};

type LiveSessionRow = {
  session_id?: string | null;
  last_seen_at?: string | null;
};

type LiveSnapshotResponse = {
  ok?: boolean;
  live?: {
    currentStreams?: Record<string, number> | null;
  } | null;
  sessions?: LiveSessionRow[] | null;
};

type AnalyticsEventRow = {
  session_id?: string | null;
  event_type?: string | null;
  created_at?: string | null;
};

type RealtimePayload = {
  new?: AnalyticsEventRow;
};

type SupabaseChannel = Parameters<typeof supabase.removeChannel>[0];

const INITIAL_STATS: UIStats = {
  viewers: 0,
  bitrate: 0,
  errors: 0,
  fps: 0,
  audioLevel: 0,
  health: "Excellent",
  formattedBitrate: "0 kbps",
};

const LIVE_WINDOW_SEC = 35;
const LIVE_POLL_MS = 15_000;
const LIVE_PURGE_MS = 5_000;
const LIVE_DEBOUNCE_MS = 500;
const LEGACY_STATS_MAX_AGE_MS = 30_000;
const LIVE_STATS_V2_ENABLED = process.env.NEXT_PUBLIC_LIVE_STATS_V2 !== "false";

type UseLiveStatsRealtimeOptions = {
  enableBackgroundPolling?: boolean;
};

function computeHealth(bitrate: number, errors: number): UIStats["health"] {
  if (errors > 0) return "Critical";
  if (bitrate < 2000) return "Unstable";
  if (bitrate < 4000) return "Good";
  return "Excellent";
}

function formatBitrate(bitrate: number) {
  return bitrate > 1000 ? `${(bitrate / 1000).toFixed(1)} Mbps` : `${bitrate} kbps`;
}

export function useLiveStatsRealtime(
  streamId: string,
  isLive: boolean,
  options?: UseLiveStatsRealtimeOptions
) {
  const [stats, setStats] = useState<UIStats>(INITIAL_STATS);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enableBackgroundPolling = options?.enableBackgroundPolling ?? false;

  useEffect(() => {
    if (!isLive) return;

    let alive = true;
    const shouldUseAnalytics = LIVE_STATS_V2_ENABLED && enableBackgroundPolling;
    let qualityChannel: SupabaseChannel | null = null;
    let analyticsChannel: SupabaseChannel | null = null;
    let analyticsClient: ReturnType<typeof supabaseBrowser> | null = null;
    let livePollTimer: ReturnType<typeof setInterval> | null = null;
    let livePurgeTimer: ReturnType<typeof setInterval> | null = null;
    let liveRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    let visibilityListener: (() => void) | null = null;
    let analyticsHasSignal = false;

    const liveSessions = new Map<string, number>();
    let latestLegacyStats: { viewers: number; createdAtMs: number } | null = null;

    const getLegacyFallbackViewers = () => {
      if (!latestLegacyStats) return null;
      const ageMs = Date.now() - latestLegacyStats.createdAtMs;
      if (ageMs > LEGACY_STATS_MAX_AGE_MS) return null;
      return latestLegacyStats.viewers;
    };

    const applyViewers = (value: number, source: "analytics" | "legacy") => {
      if (!alive) return;
      const candidate = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
      let viewers = candidate;
      if (source === "analytics" && !analyticsHasSignal) {
        const fallback = getLegacyFallbackViewers();
        if (fallback !== null) {
          viewers = Math.max(candidate, fallback);
        }
      }
      setStats((prev) => (prev.viewers === viewers ? prev : { ...prev, viewers }));
    };

    const applyQuality = (data: StreamStatsRow | null | undefined) => {
      if (!alive || !data) return;
      const bitrate = Number(data.bitrate_kbps ?? 0);
      const errors = Number(data.errors ?? 0);
      const fps = Number(data.fps ?? 60);
      const parsedCreatedAt = Date.parse(data.created_at ?? "");
      if (Number.isFinite(parsedCreatedAt)) {
        latestLegacyStats = {
          viewers: Number(data.viewers ?? 0),
          createdAtMs: parsedCreatedAt,
        };
      }
      setStats((prev) => ({
        ...prev,
        bitrate,
        errors,
        fps,
        health: computeHealth(bitrate, errors),
        formattedBitrate: formatBitrate(bitrate),
      }));
    };

    const recomputeFromSessions = () => {
      if (!alive) return;
      if (liveSessions.size === 0) {
        applyViewers(0, "analytics");
        return;
      }

      const now = Date.now();
      const threshold = LIVE_WINDOW_SEC * 1000;
      for (const [sessionId, lastSeenMs] of liveSessions.entries()) {
        if (now - lastSeenMs > threshold) liveSessions.delete(sessionId);
      }
      applyViewers(liveSessions.size, "analytics");
    };

    const loadLiveSnapshot = async () => {
      try {
        const params = new URLSearchParams({
          streamId,
          windowSec: String(LIVE_WINDOW_SEC),
        });
        const res = await fetch(`/api/analytics/live?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as LiveSnapshotResponse | null;
        if (!alive || !res.ok || !json?.live) return;

        const currentStreams = json.live.currentStreams ?? {};
        const current = Number(currentStreams[streamId] ?? 0);
        const sessionCount = Array.isArray(json.sessions) ? json.sessions.length : 0;
        if (current > 0 || sessionCount > 0) analyticsHasSignal = true;
        applyViewers(current, "analytics");

        liveSessions.clear();
        for (const session of json.sessions ?? []) {
          const sessionId = (session?.session_id ?? "").trim();
          if (!sessionId) continue;
          const parsed = Date.parse(session?.last_seen_at ?? "");
          liveSessions.set(sessionId, Number.isFinite(parsed) ? parsed : Date.now());
        }
      } catch {
        // Keep previous value until next poll/realtime tick.
      }
    };

    const scheduleLiveRefresh = (delay = LIVE_DEBOUNCE_MS) => {
      if (liveRefreshTimer) return;
      liveRefreshTimer = setTimeout(() => {
        liveRefreshTimer = null;
        void loadLiveSnapshot();
      }, delay);
    };

    const initQualityStream = async () => {
      const { data } = await supabase
        .from("stream_stats")
        .select("viewers, bitrate_kbps, errors, fps, created_at")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const latest = (data ?? null) as StreamStatsRow | null;
      applyQuality(latest);
      if (!shouldUseAnalytics) applyViewers(Number(latest?.viewers ?? 0), "legacy");

      qualityChannel = supabase
        .channel(`stream-quality:${streamId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "stream_stats",
            filter: `stream_id=eq.${streamId}`,
          },
          (payload: { new: StreamStatsRow }) => {
            applyQuality(payload.new);
            if (!shouldUseAnalytics) {
              applyViewers(Number(payload.new?.viewers ?? 0), "legacy");
            }
          }
        )
        .subscribe();
    };

    const initAnalyticsRealtime = async () => {
      try {
        const tokenRes = await fetch("/api/auth/realtime-token", { cache: "no-store" });
        const tokenJson = await tokenRes.json().catch(() => null);
        const accessToken =
          tokenRes.ok && tokenJson?.ok && typeof tokenJson.access_token === "string"
            ? (tokenJson.access_token as string)
            : null;
        if (!alive || !accessToken) return;

        analyticsClient = supabaseBrowser(accessToken);
        analyticsChannel = analyticsClient
          .channel(`stream-live:${streamId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "analytics_events",
              filter: `stream_id=eq.${streamId}`,
            },
            (payload: RealtimePayload) => {
              const row = payload.new;
              const sessionId = (row?.session_id ?? "").trim();
              if (!sessionId) {
                scheduleLiveRefresh();
                return;
              }

              const eventType = (row?.event_type ?? "").trim().toUpperCase();
              if (
                eventType === "STOP" ||
                eventType === "STOP_STREAM" ||
                eventType === "END" ||
                eventType === "END_STREAM" ||
                eventType === "END_VIEW"
              ) {
                liveSessions.delete(sessionId);
                recomputeFromSessions();
                scheduleLiveRefresh(1_500);
                return;
              }

              if (eventType === "START_STREAM" || eventType === "HEARTBEAT") {
                analyticsHasSignal = true;
                const parsed = Date.parse(row?.created_at ?? "");
                liveSessions.set(sessionId, Number.isFinite(parsed) ? parsed : Date.now());
                recomputeFromSessions();
                return;
              }

              scheduleLiveRefresh();
            }
          )
          .subscribe();
      } catch (error) {
        console.error("Stream live realtime init error", error);
      }
    };

    audioIntervalRef.current = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        audioLevel: Math.floor(Math.random() * 50) + 30,
      }));
    }, 100);

    void initQualityStream();

    if (shouldUseAnalytics) {
      void loadLiveSnapshot();
      livePollTimer = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        void loadLiveSnapshot();
      }, LIVE_POLL_MS);
      livePurgeTimer = setInterval(() => {
        recomputeFromSessions();
      }, LIVE_PURGE_MS);
      visibilityListener = () => {
        if (typeof document !== "undefined" && !document.hidden) {
          void loadLiveSnapshot();
        }
      };
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", visibilityListener);
      }
      void initAnalyticsRealtime();
    }

    return () => {
      alive = false;
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (livePollTimer) clearInterval(livePollTimer);
      if (livePurgeTimer) clearInterval(livePurgeTimer);
      if (liveRefreshTimer) clearTimeout(liveRefreshTimer);
      if (visibilityListener && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", visibilityListener);
      }
      try {
        if (qualityChannel) supabase.removeChannel(qualityChannel);
      } catch {}
      try {
        if (analyticsChannel) analyticsChannel.unsubscribe();
      } catch {}
      try {
        analyticsClient?.removeAllChannels();
      } catch {}
    };
  }, [streamId, isLive, enableBackgroundPolling]);

  return isLive ? stats : INITIAL_STATS;
}

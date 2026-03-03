import type { SupabaseClient } from "@supabase/supabase-js";
import { clampLiveWindowSec } from "./viewer-live";

type StreamStatsLiveRow = {
  stream_id: string | null;
  viewers: number | null;
  created_at: string | null;
};

export type StreamStatsLiveSnapshot = {
  activeUsers: number;
  currentStreams: Record<string, number>;
  asOf: string;
  windowSec: number;
  source: "stream_stats_fallback";
};

type StreamStatsLiveFallbackResult =
  | { ok: true; snapshot: StreamStatsLiveSnapshot }
  | { ok: false; error: string; code?: string | null };

function toNonNegativeInt(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

export async function getStreamStatsLiveFallback(
  sb: SupabaseClient,
  input: {
    tenantId: string;
    streamIds?: string[] | null;
    windowSec?: number | string | null;
    maxRows?: number;
  }
): Promise<StreamStatsLiveFallbackResult> {
  const tenantId = input.tenantId.trim();
  const windowSec = clampLiveWindowSec(input.windowSec);
  const asOf = new Date().toISOString();
  if (!tenantId) {
    return {
      ok: true,
      snapshot: {
        activeUsers: 0,
        currentStreams: {},
        asOf,
        windowSec,
        source: "stream_stats_fallback",
      },
    };
  }

  const streamIds = Array.isArray(input.streamIds)
    ? input.streamIds.map((id) => id.trim()).filter(Boolean)
    : null;

  if (streamIds && streamIds.length === 0) {
    return {
      ok: true,
      snapshot: {
        activeUsers: 0,
        currentStreams: {},
        asOf,
        windowSec,
        source: "stream_stats_fallback",
      },
    };
  }

  const thresholdIso = new Date(Date.now() - windowSec * 1000).toISOString();
  const maxRows = Number.isFinite(input.maxRows) ? Math.max(100, Math.round(input.maxRows as number)) : 4000;

  let query = sb
    .from("stream_stats")
    .select("stream_id, viewers, created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", thresholdIso);

  if (streamIds && streamIds.length === 1) {
    query = query.eq("stream_id", streamIds[0]);
  } else if (streamIds && streamIds.length > 1) {
    query = query.in("stream_id", streamIds);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(maxRows);
  if (error) {
    return { ok: false, error: error.message, code: error.code };
  }

  const rows = (data ?? []) as StreamStatsLiveRow[];
  const seen = new Set<string>();
  const currentStreams: Record<string, number> = {};

  for (const row of rows) {
    const streamId = (row.stream_id ?? "").trim();
    if (!streamId || seen.has(streamId)) continue;
    seen.add(streamId);

    const viewers = toNonNegativeInt(row.viewers);
    if (viewers <= 0) continue;
    currentStreams[streamId] = viewers;
  }

  const activeUsers = Object.values(currentStreams).reduce((sum, value) => sum + value, 0);
  return {
    ok: true,
    snapshot: {
      activeUsers,
      currentStreams,
      asOf,
      windowSec,
      source: "stream_stats_fallback",
    },
  };
}

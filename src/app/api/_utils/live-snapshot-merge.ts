import type { PlaybackSessionViewRow } from "./playback-session-fallback";
import type { ViewerLiveSessionRow, ViewerLiveSnapshot } from "./viewer-live";

export type LiveSnapshotSource =
  | ViewerLiveSnapshot["source"]
  | "playback_sessions"
  | "combined_live";

export type MergeableLiveSnapshot = Omit<ViewerLiveSnapshot, "source"> & {
  source: LiveSnapshotSource;
};

function cleanId(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function toMs(value: string | null | undefined) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function pickLatestIso(...values: Array<string | null | undefined>) {
  let best: string | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;

  for (const value of values) {
    const iso = cleanId(value);
    if (!iso) continue;
    const parsed = toMs(iso);
    if (parsed === null) continue;
    if (parsed > bestMs) {
      best = iso;
      bestMs = parsed;
    }
  }

  return best;
}

function pickEarliestIso(...values: Array<string | null | undefined>) {
  let best: string | null = null;
  let bestMs = Number.POSITIVE_INFINITY;

  for (const value of values) {
    const iso = cleanId(value);
    if (!iso) continue;
    const parsed = toMs(iso);
    if (parsed === null) continue;
    if (parsed < bestMs) {
      best = iso;
      bestMs = parsed;
    }
  }

  return best;
}

function normalizeSessionRow(
  row: ViewerLiveSessionRow | PlaybackSessionViewRow
): ViewerLiveSessionRow | null {
  const sessionId = cleanId(row.session_id);
  const lastSeenAt = pickLatestIso(row.last_seen_at);
  if (!sessionId || !lastSeenAt) return null;

  return {
    session_id: sessionId,
    stream_id: cleanId(row.stream_id),
    last_seen_at: lastSeenAt,
    started_at: pickEarliestIso(row.started_at),
    device_type: cleanId(row.device_type),
  };
}

function mergeSessionRows(
  left: ViewerLiveSessionRow,
  right: ViewerLiveSessionRow
): ViewerLiveSessionRow {
  return {
    session_id: left.session_id,
    stream_id: cleanId(left.stream_id) ?? cleanId(right.stream_id),
    last_seen_at: pickLatestIso(left.last_seen_at, right.last_seen_at) ?? left.last_seen_at,
    started_at: pickEarliestIso(left.started_at, right.started_at),
    device_type: cleanId(left.device_type) ?? cleanId(right.device_type),
  };
}

export function mergeLiveSessionRows(input: {
  primary: ViewerLiveSessionRow[];
  playback: PlaybackSessionViewRow[];
}) {
  const merged = new Map<string, ViewerLiveSessionRow>();

  for (const row of input.primary) {
    const normalized = normalizeSessionRow(row);
    if (!normalized) continue;
    merged.set(normalized.session_id, normalized);
  }

  for (const row of input.playback) {
    const normalized = normalizeSessionRow(row);
    if (!normalized) continue;

    const existing = merged.get(normalized.session_id);
    if (!existing) {
      merged.set(normalized.session_id, normalized);
      continue;
    }

    merged.set(normalized.session_id, mergeSessionRows(existing, normalized));
  }

  return Array.from(merged.values()).sort((left, right) => {
    const leftMs = toMs(left.last_seen_at) ?? 0;
    const rightMs = toMs(right.last_seen_at) ?? 0;
    return rightMs - leftMs;
  });
}

export function buildLiveSnapshotFromSessionRows(input: {
  sessions: ViewerLiveSessionRow[];
  windowSec: number;
  asOf?: string;
  source: LiveSnapshotSource;
}): MergeableLiveSnapshot {
  const currentStreams: Record<string, number> = {};

  for (const row of input.sessions) {
    const streamId = cleanId(row.stream_id);
    if (!streamId) continue;
    currentStreams[streamId] = (currentStreams[streamId] ?? 0) + 1;
  }

  return {
    activeUsers: input.sessions.length,
    currentStreams,
    sessions: input.sessions,
    windowSec: input.windowSec,
    asOf: input.asOf ?? new Date().toISOString(),
    source: input.source,
  };
}

export function mergeLiveSnapshots(input: {
  primary: ViewerLiveSnapshot;
  playback?: MergeableLiveSnapshot | null;
}): MergeableLiveSnapshot {
  const playback = input.playback;
  if (!playback) {
    return {
      ...input.primary,
      source: input.primary.source,
    };
  }

  const mergedSessions = mergeLiveSessionRows({
    primary: input.primary.sessions,
    playback: playback.sessions,
  });

  const source: LiveSnapshotSource =
    input.primary.sessions.length > 0 && playback.sessions.length > 0
      ? "combined_live"
      : playback.sessions.length > 0
      ? playback.source
      : input.primary.source;

  return buildLiveSnapshotFromSessionRows({
    sessions: mergedSessions,
    windowSec: input.primary.windowSec,
    asOf: pickLatestIso(input.primary.asOf, playback.asOf) ?? input.primary.asOf,
    source,
  });
}

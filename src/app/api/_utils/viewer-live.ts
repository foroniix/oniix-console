import type { SupabaseClient } from "@supabase/supabase-js";

const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

export const DEFAULT_LIVE_WINDOW_SEC = 35;
const MIN_LIVE_WINDOW_SEC = 10;
const MAX_LIVE_WINDOW_SEC = 300;

type SourceType = "viewer_sessions_live" | "analytics_events_fallback";

export type ViewerLiveSessionRow = {
  session_id: string;
  stream_id: string | null;
  last_seen_at: string;
  started_at: string | null;
  device_type: string | null;
};

export type ViewerLiveSnapshot = {
  activeUsers: number;
  currentStreams: Record<string, number>;
  sessions: ViewerLiveSessionRow[];
  windowSec: number;
  asOf: string;
  source: SourceType;
};

export type ViewerLiveSnapshotResult =
  | { ok: true; snapshot: ViewerLiveSnapshot }
  | { ok: false; tableMissing: boolean; error?: string; code?: string | null };

export type ViewerLiveEventRow = {
  session_id: string | null;
  stream_id: string | null;
  event_type: string | null;
  created_at?: string | null;
};

function normalizeEventType(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function isStopEvent(eventType: string | null | undefined) {
  const normalized = normalizeEventType(eventType);
  return (
    normalized === "STOP" ||
    normalized === "STOP_STREAM" ||
    normalized === "END" ||
    normalized === "END_STREAM" ||
    normalized === "END_VIEW"
  );
}

function isAliveEvent(eventType: string | null | undefined) {
  const normalized = normalizeEventType(eventType);
  return normalized === "START_STREAM" || normalized === "HEARTBEAT";
}

function isMissingTableError(code?: string | null) {
  return Boolean(code && MISSING_TABLE_CODES.has(code));
}

export function clampLiveWindowSec(value: number | string | null | undefined) {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_LIVE_WINDOW_SEC;
  const rounded = Math.round(parsed);
  if (rounded < MIN_LIVE_WINDOW_SEC) return MIN_LIVE_WINDOW_SEC;
  if (rounded > MAX_LIVE_WINDOW_SEC) return MAX_LIVE_WINDOW_SEC;
  return rounded;
}

export function buildLiveSnapshotFromEvents(
  rows: ViewerLiveEventRow[],
  options?: { windowSec?: number; asOf?: string }
): ViewerLiveSnapshot {
  const windowSec = clampLiveWindowSec(options?.windowSec);
  const asOf = options?.asOf ?? new Date().toISOString();
  const sessionMap = new Map<string, { stream_id: string | null; last_seen_at: string }>();

  for (const row of rows) {
    const sessionId = row.session_id?.trim();
    if (!sessionId) continue;
    if (isStopEvent(row.event_type)) {
      sessionMap.delete(sessionId);
      continue;
    }
    if (!isAliveEvent(row.event_type)) continue;
    sessionMap.set(sessionId, {
      stream_id: row.stream_id ?? null,
      last_seen_at: row.created_at ?? asOf,
    });
  }

  const sessions: ViewerLiveSessionRow[] = [];
  const currentStreams: Record<string, number> = {};
  for (const [session_id, payload] of sessionMap.entries()) {
    sessions.push({
      session_id,
      stream_id: payload.stream_id,
      last_seen_at: payload.last_seen_at,
      started_at: null,
      device_type: null,
    });
    if (!payload.stream_id) continue;
    currentStreams[payload.stream_id] = (currentStreams[payload.stream_id] ?? 0) + 1;
  }

  return {
    activeUsers: sessions.length,
    currentStreams,
    sessions,
    windowSec,
    asOf,
    source: "analytics_events_fallback",
  };
}

type TouchViewerLiveSessionInput = {
  tenantId: string;
  sessionId: string;
  streamId: string | null;
  userId?: string | null;
  deviceType?: string | null;
  eventType: string;
  occurredAt?: string;
};

export async function touchViewerLiveSession(
  sb: SupabaseClient,
  input: TouchViewerLiveSessionInput
): Promise<ViewerLiveSnapshotResult | { ok: true }> {
  const sessionId = input.sessionId.trim();
  const tenantId = input.tenantId.trim();
  const normalized = normalizeEventType(input.eventType);
  if (!sessionId || !tenantId) return { ok: true };
  if (!isAliveEvent(normalized) && !isStopEvent(normalized)) return { ok: true };

  const nowIso = input.occurredAt ?? new Date().toISOString();

  if (isStopEvent(normalized)) {
    const { error } = await sb
      .from("viewer_sessions_live")
      .update({
        is_active: false,
        last_seen_at: nowIso,
        ended_at: nowIso,
        ended_reason: normalized,
        updated_at: nowIso,
      })
      .eq("tenant_id", tenantId)
      .eq("session_id", sessionId)
      .eq("is_active", true);

    if (!error) return { ok: true };
    if (isMissingTableError(error.code)) {
      return { ok: false, tableMissing: true, error: error.message, code: error.code };
    }
    return { ok: false, tableMissing: false, error: error.message, code: error.code };
  }

  const payload: {
    tenant_id: string;
    session_id: string;
    stream_id: string | null;
    user_id: string | null;
    device_type: string | null;
    last_seen_at: string;
    updated_at: string;
    is_active: boolean;
    ended_at: null;
    ended_reason: null;
    started_at?: string;
  } = {
    tenant_id: tenantId,
    session_id: sessionId,
    stream_id: input.streamId,
    user_id: input.userId ?? null,
    device_type: input.deviceType ?? null,
    last_seen_at: nowIso,
    updated_at: nowIso,
    is_active: true,
    ended_at: null,
    ended_reason: null,
  };

  if (normalized === "START_STREAM") {
    payload.started_at = nowIso;
  }

  const { error } = await sb.from("viewer_sessions_live").upsert(payload, {
    onConflict: "tenant_id,session_id",
  });
  if (!error) return { ok: true };
  if (isMissingTableError(error.code)) {
    return { ok: false, tableMissing: true, error: error.message, code: error.code };
  }
  return { ok: false, tableMissing: false, error: error.message, code: error.code };
}

type GetViewerLiveSnapshotInput = {
  tenantId: string;
  windowSec?: number | string | null;
  expireStale?: boolean;
  streamIds?: string[] | null;
};

export async function getViewerLiveSnapshot(
  sb: SupabaseClient,
  input: GetViewerLiveSnapshotInput
): Promise<ViewerLiveSnapshotResult> {
  const tenantId = input.tenantId.trim();
  if (!tenantId) return { ok: true, snapshot: buildLiveSnapshotFromEvents([]) };

  const windowSec = clampLiveWindowSec(input.windowSec);
  const asOf = new Date().toISOString();
  const thresholdIso = new Date(Date.now() - windowSec * 1000).toISOString();
  const streamIds = Array.isArray(input.streamIds)
    ? input.streamIds.map((v) => v.trim()).filter(Boolean)
    : null;

  if (input.expireStale !== false) {
    const { error: staleError } = await sb
      .from("viewer_sessions_live")
      .update({
        is_active: false,
        ended_at: asOf,
        ended_reason: "TIMEOUT",
        updated_at: asOf,
      })
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .lt("last_seen_at", thresholdIso);

    if (staleError) {
      if (isMissingTableError(staleError.code)) {
        return { ok: false, tableMissing: true, error: staleError.message, code: staleError.code };
      }
      return { ok: false, tableMissing: false, error: staleError.message, code: staleError.code };
    }
  }

  let query = sb
    .from("viewer_sessions_live")
    .select("session_id, stream_id, last_seen_at, started_at, device_type")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .gte("last_seen_at", thresholdIso);

  if (streamIds && streamIds.length === 0) {
    return {
      ok: true,
      snapshot: {
        activeUsers: 0,
        currentStreams: {},
        sessions: [],
        windowSec,
        asOf,
        source: "viewer_sessions_live",
      },
    };
  }

  if (streamIds && streamIds.length === 1) {
    query = query.eq("stream_id", streamIds[0]);
  } else if (streamIds && streamIds.length > 1) {
    query = query.in("stream_id", streamIds);
  }

  const { data, error } = await query.order("last_seen_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error.code)) {
      return { ok: false, tableMissing: true, error: error.message, code: error.code };
    }
    return { ok: false, tableMissing: false, error: error.message, code: error.code };
  }

  const rows = (data ?? []) as ViewerLiveSessionRow[];
  const currentStreams: Record<string, number> = {};
  for (const row of rows) {
    if (!row.stream_id) continue;
    currentStreams[row.stream_id] = (currentStreams[row.stream_id] ?? 0) + 1;
  }

  return {
    ok: true,
    snapshot: {
      activeUsers: rows.length,
      currentStreams,
      sessions: rows,
      windowSec,
      asOf,
      source: "viewer_sessions_live",
    },
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlaybackSessionFallbackRow = {
  id: string;
  channel_id: string;
  platform: string | null;
  started_at: string;
  last_heartbeat_at: string | null;
  ended_at: string | null;
};

export type PlaybackSessionViewRow = {
  session_id: string;
  stream_id: string | null;
  last_seen_at: string;
  started_at: string | null;
  device_type: string | null;
};

type QueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string | null };

function cleanId(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => cleanId(value)).filter((value): value is string => Boolean(value))));
}

export function mapPlaybackPlatformToDevice(platform: string | null | undefined) {
  const normalized = (platform ?? "").trim().toLowerCase();
  if (normalized === "ios" || normalized === "android") return "mobile";
  if (normalized === "tablet" || normalized === "ipad") return "tablet";
  return "desktop";
}

export async function resolvePlaybackChannelIds(
  sb: SupabaseClient,
  input: {
    tenantId: string;
    channelId?: string | null;
    streamIds?: string[] | null;
  }
): Promise<QueryResult<string[] | null>> {
  const channelId = cleanId(input.channelId);
  if (channelId) return { ok: true, data: [channelId] };

  const streamIds = uniqueIds(input.streamIds ?? []);
  if (streamIds.length === 0) return { ok: true, data: null };

  let query = sb
    .from("streams")
    .select("channel_id")
    .eq("tenant_id", input.tenantId);

  if (streamIds.length === 1) {
    query = query.eq("id", streamIds[0]);
  } else {
    query = query.in("id", streamIds);
  }

  const { data, error } = await query.limit(500);
  if (error) return { ok: false, error: error.message, code: error.code };

  return {
    ok: true,
    data: uniqueIds((data ?? []).map((row) => (row as { channel_id?: string | null }).channel_id)),
  };
}

export async function listActivePlaybackSessions(
  sb: SupabaseClient,
  input: {
    tenantId: string;
    sinceIso: string;
    channelIds?: string[] | null;
  }
): Promise<QueryResult<PlaybackSessionFallbackRow[]>> {
  const channelIds = uniqueIds(input.channelIds ?? []);
  if (input.channelIds && channelIds.length === 0) {
    return { ok: true, data: [] };
  }

  let query = sb
    .from("playback_sessions")
    .select("id,channel_id,platform,started_at,last_heartbeat_at,ended_at")
    .eq("tenant_id", input.tenantId)
    .is("ended_at", null)
    .gte("last_heartbeat_at", input.sinceIso);

  if (channelIds.length === 1) {
    query = query.eq("channel_id", channelIds[0]);
  } else if (channelIds.length > 1) {
    query = query.in("channel_id", channelIds);
  }

  const { data, error } = await query.order("last_heartbeat_at", { ascending: false });
  if (error) return { ok: false, error: error.message, code: error.code };

  return { ok: true, data: (data ?? []) as PlaybackSessionFallbackRow[] };
}

export async function listPlaybackSessionsSince(
  sb: SupabaseClient,
  input: {
    tenantId: string;
    sinceIso: string;
    untilIso?: string | null;
    channelIds?: string[] | null;
  }
): Promise<QueryResult<PlaybackSessionFallbackRow[]>> {
  const channelIds = uniqueIds(input.channelIds ?? []);
  if (input.channelIds && channelIds.length === 0) {
    return { ok: true, data: [] };
  }

  let query = sb
    .from("playback_sessions")
    .select("id,channel_id,platform,started_at,last_heartbeat_at,ended_at")
    .eq("tenant_id", input.tenantId)
    .lte("started_at", input.untilIso ?? new Date().toISOString())
    .or(`last_heartbeat_at.gte.${input.sinceIso},ended_at.gte.${input.sinceIso},started_at.gte.${input.sinceIso}`);

  if (channelIds.length === 1) {
    query = query.eq("channel_id", channelIds[0]);
  } else if (channelIds.length > 1) {
    query = query.in("channel_id", channelIds);
  }

  const { data, error } = await query.order("started_at", { ascending: true });
  if (error) return { ok: false, error: error.message, code: error.code };

  return { ok: true, data: (data ?? []) as PlaybackSessionFallbackRow[] };
}

export async function getPreferredStreamsByChannel(
  sb: SupabaseClient,
  input: {
    tenantId: string;
    channelIds: string[];
  }
): Promise<QueryResult<Map<string, string>>> {
  const channelIds = uniqueIds(input.channelIds);
  if (channelIds.length === 0) return { ok: true, data: new Map() };

  let query = sb
    .from("streams")
    .select("id,channel_id,status,updated_at,created_at")
    .eq("tenant_id", input.tenantId);

  if (channelIds.length === 1) {
    query = query.eq("channel_id", channelIds[0]);
  } else {
    query = query.in("channel_id", channelIds);
  }

  const { data, error } = await query.limit(1000);
  if (error) return { ok: false, error: error.message, code: error.code };

  const grouped = new Map<string, Array<Record<string, unknown>>>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const channelId = cleanId(String(row.channel_id ?? ""));
    if (!channelId) continue;
    const items = grouped.get(channelId) ?? [];
    items.push(row);
    grouped.set(channelId, items);
  }

  const preferred = new Map<string, string>();
  for (const [channelId, rows] of grouped.entries()) {
    rows.sort((left, right) => {
      const leftStatus = String(left.status ?? "").toUpperCase() === "LIVE" ? 0 : 1;
      const rightStatus = String(right.status ?? "").toUpperCase() === "LIVE" ? 0 : 1;
      if (leftStatus !== rightStatus) return leftStatus - rightStatus;

      const leftUpdated = Date.parse(String(left.updated_at ?? left.created_at ?? 0));
      const rightUpdated = Date.parse(String(right.updated_at ?? right.created_at ?? 0));
      return rightUpdated - leftUpdated;
    });

    const streamId = cleanId(String(rows[0]?.id ?? ""));
    if (streamId) preferred.set(channelId, streamId);
  }

  return { ok: true, data: preferred };
}

export function buildPlaybackCurrentStreams(
  rows: PlaybackSessionFallbackRow[],
  input: {
    channelToStreamId?: Map<string, string>;
    streamIdOverride?: string | null;
  } = {}
) {
  const currentStreams: Record<string, number> = {};
  const streamIdOverride = cleanId(input.streamIdOverride);

  for (const row of rows) {
    const streamId =
      streamIdOverride ||
      cleanId(input.channelToStreamId?.get(row.channel_id) ?? null);
    if (!streamId) continue;
    currentStreams[streamId] = (currentStreams[streamId] ?? 0) + 1;
  }

  return currentStreams;
}

export function buildPlaybackSessionViewRows(
  rows: PlaybackSessionFallbackRow[],
  input: {
    channelToStreamId?: Map<string, string>;
    streamIdOverride?: string | null;
  } = {}
) {
  const streamIdOverride = cleanId(input.streamIdOverride);

  return rows.map((row) => ({
    session_id: row.id,
    stream_id:
      streamIdOverride ||
      cleanId(input.channelToStreamId?.get(row.channel_id) ?? null),
    last_seen_at: row.last_heartbeat_at ?? row.ended_at ?? row.started_at,
    started_at: row.started_at ?? null,
    device_type: mapPlaybackPlatformToDevice(row.platform),
  })) satisfies PlaybackSessionViewRow[];
}

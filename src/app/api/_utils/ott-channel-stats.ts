import type { SupabaseClient } from "@supabase/supabase-js";

export type ChannelHealthStatus = {
  status: "ok" | "degraded" | "down" | null;
  message: string | null;
  lastCheckAt: string | null;
  masterPlaylistHttpCode: number | null;
  mediaPlaylistHttpCode: number | null;
  segmentHttpCode: number | null;
};

export type ChannelRealtimeMinute = {
  bucketMinute: string;
  activeViewers: number;
  sessionsStarted: number;
  watchSeconds: number;
  bufferSeconds: number;
  errorCount: number;
  plays: number;
};

export type ChannelOttRealtimeStats = {
  activeViewers: number;
  sessionsToday: number;
  watchMinutesToday: number;
  bufferRatio: number;
  errorsToday: number;
  lastMinutes: ChannelRealtimeMinute[];
  health: ChannelHealthStatus;
};

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function isMissingRelationError(code?: string | null) {
  return code === "42P01" || code === "PGRST205";
}

export async function getChannelOttRealtimeStats(input: {
  sb: SupabaseClient;
  tenantId: string;
  channelId: string;
  rangeMinutes?: number;
  presenceWindowSeconds?: number;
  now?: Date;
}) {
  const { sb, tenantId, channelId } = input;
  const rangeMinutes = input.rangeMinutes ?? 5;
  const presenceWindowSeconds = input.presenceWindowSeconds ?? 35;
  const now = input.now ?? new Date();
  const todayStart = startOfUtcDay(now);
  const rangeStart = new Date(now.getTime() - rangeMinutes * 60_000).toISOString();
  const presenceCutoff = new Date(now.getTime() - presenceWindowSeconds * 1000).toISOString();

  const { data: channel, error: channelError } = await sb
    .from("channels")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", channelId)
    .maybeSingle();

  if (channelError) {
    return { ok: false as const, error: channelError.message, code: channelError.code ?? null };
  }
  if (!channel) {
    return { ok: false as const, error: "Ressource introuvable.", code: "NOT_FOUND" };
  }

  const [presenceRes, sessionsRes, statsTodayRes, lastMinutesRes, healthRes] = await Promise.all([
    sb
      .from("channel_realtime_presence")
      .select("session_id")
      .eq("tenant_id", tenantId)
      .eq("channel_id", channelId)
      .eq("is_playing", true)
      .gte("last_seen_at", presenceCutoff),
    sb
      .from("playback_sessions")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("channel_id", channelId)
      .gte("started_at", todayStart),
    sb
      .from("channel_stats_minute")
      .select("watch_seconds, buffer_seconds, error_count")
      .eq("tenant_id", tenantId)
      .eq("channel_id", channelId)
      .gte("bucket_minute", todayStart),
    sb
      .from("channel_stats_minute")
      .select("bucket_minute, active_viewers, sessions_started, watch_seconds, buffer_seconds, error_count, plays")
      .eq("tenant_id", tenantId)
      .eq("channel_id", channelId)
      .gte("bucket_minute", rangeStart)
      .order("bucket_minute", { ascending: true }),
    sb
      .from("channel_health")
      .select(
        "status, message, last_check_at, master_playlist_http_code, media_playlist_http_code, segment_http_code"
      )
      .eq("tenant_id", tenantId)
      .eq("channel_id", channelId)
      .maybeSingle(),
  ]);

  const tableErrors = [
    presenceRes.error,
    sessionsRes.error,
    statsTodayRes.error,
    lastMinutesRes.error,
    healthRes.error,
  ].filter(Boolean);

  if (tableErrors.length > 0) {
    const firstError = tableErrors[0]!;
    if (isMissingRelationError(firstError.code ?? null)) {
      return { ok: false as const, error: "Migration OTT non appliquee.", code: firstError.code ?? null };
    }

    return { ok: false as const, error: firstError.message, code: firstError.code ?? null };
  }

  const totals = (statsTodayRes.data ?? []).reduce(
    (acc, row) => {
      acc.watchSeconds += Number(row.watch_seconds ?? 0);
      acc.bufferSeconds += Number(row.buffer_seconds ?? 0);
      acc.errors += Number(row.error_count ?? 0);
      return acc;
    },
    { watchSeconds: 0, bufferSeconds: 0, errors: 0 }
  );

  return {
    ok: true as const,
    data: {
      activeViewers: (presenceRes.data ?? []).length,
      sessionsToday: (sessionsRes.data ?? []).length,
      watchMinutesToday: Math.round((totals.watchSeconds / 60) * 100) / 100,
      bufferRatio:
        totals.watchSeconds + totals.bufferSeconds > 0
          ? Number((totals.bufferSeconds / (totals.watchSeconds + totals.bufferSeconds)).toFixed(4))
          : 0,
      errorsToday: totals.errors,
      lastMinutes: (lastMinutesRes.data ?? []).map((row) => ({
        bucketMinute: String(row.bucket_minute),
        activeViewers: Number(row.active_viewers ?? 0),
        sessionsStarted: Number(row.sessions_started ?? 0),
        watchSeconds: Number(row.watch_seconds ?? 0),
        bufferSeconds: Number(row.buffer_seconds ?? 0),
        errorCount: Number(row.error_count ?? 0),
        plays: Number(row.plays ?? 0),
      })),
      health: {
        status: (healthRes.data?.status as ChannelHealthStatus["status"]) ?? null,
        message: healthRes.data?.message ?? null,
        lastCheckAt: healthRes.data?.last_check_at ?? null,
        masterPlaylistHttpCode: healthRes.data?.master_playlist_http_code ?? null,
        mediaPlaylistHttpCode: healthRes.data?.media_playlist_http_code ?? null,
        segmentHttpCode: healthRes.data?.segment_http_code ?? null,
      },
    } satisfies ChannelOttRealtimeStats,
  };
}

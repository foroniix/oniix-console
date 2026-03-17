import {
  mapPlaybackPlatformToDevice,
  type PlaybackSessionFallbackRow,
} from "./playback-session-fallback";

const HEARTBEAT_SECONDS = 15;

export type AnalyticsSummaryEventRow = {
  created_at: string;
  device_type: string | null;
  stream_id: string | null;
  session_id: string;
  event_type: string;
};

export type AnalyticsSessionSource = "mobile_app" | "web";

export type UnifiedAnalyticsSession = {
  sessionId: string;
  source: AnalyticsSessionSource;
  streamId: string | null;
  deviceType: string;
  startedAt: string | null;
  lastSeenAt: string | null;
  watchSeconds: number;
  eventCount: number;
};

export type PlatformBreakdownEntry = {
  name: "App mobile" | "Web";
  value: number;
  sessions: number;
  watchTime: number;
  watchTimeSeconds: number;
  watchTimeLabel: string;
  color: string;
};

export function formatWatchDurationSeconds(inputSeconds: number) {
  const totalSeconds = Math.max(0, Math.round(inputSeconds));
  if (totalSeconds <= 0) return "0s";
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes < 10 && seconds > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${minutes}m`;
}

function cleanId(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function toMs(value: string | null | undefined) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function overlapSeconds(input: {
  startMs: number | null;
  endMs: number | null;
  windowStartMs: number;
  windowEndMs: number;
}) {
  if (input.startMs === null || input.endMs === null) return 0;
  const effectiveStart = Math.max(input.startMs, input.windowStartMs);
  const effectiveEnd = Math.min(input.endMs, input.windowEndMs);
  if (effectiveEnd <= effectiveStart) return 0;
  return Math.max(0, Math.round((effectiveEnd - effectiveStart) / 1000));
}

function normalizeEventType(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function pickLastNonEmpty(values: Array<string | null | undefined>) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = cleanId(values[index]);
    if (value) return value;
  }
  return null;
}

function normalizeDeviceType(value: string | null | undefined) {
  return cleanId(value) ?? "desktop";
}

function estimateAnalyticsWatchSeconds(events: AnalyticsSummaryEventRow[]) {
  if (events.length === 0) return 0;

  const heartbeatCount = events.filter(
    (event) => normalizeEventType(event.event_type) === "HEARTBEAT"
  ).length;
  if (heartbeatCount > 0) {
    return heartbeatCount * HEARTBEAT_SECONDS;
  }

  const eventTimes = events
    .map((event) => toMs(event.created_at))
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);

  if (eventTimes.length >= 2) {
    const diffSeconds = Math.round((eventTimes[eventTimes.length - 1] - eventTimes[0]) / 1000);
    if (diffSeconds > 0) return diffSeconds;
  }

  return HEARTBEAT_SECONDS;
}

function buildPlaybackSession(
  row: PlaybackSessionFallbackRow,
  input: {
    channelToStreamId?: Map<string, string>;
    streamIdOverride?: string | null;
    windowStartMs: number;
    windowEndMs: number;
  }
): UnifiedAnalyticsSession {
  const startedAtMs = toMs(row.started_at);
  const lastSeenAt =
    cleanId(row.last_heartbeat_at) ??
    cleanId(row.ended_at) ??
    cleanId(row.started_at);
  const lastSeenAtMs = toMs(lastSeenAt);

  return {
    sessionId: row.id,
    source: "mobile_app",
    streamId:
      cleanId(input.streamIdOverride) ??
      cleanId(input.channelToStreamId?.get(row.channel_id) ?? null),
    deviceType: mapPlaybackPlatformToDevice(row.platform),
    startedAt: cleanId(row.started_at),
    lastSeenAt,
    watchSeconds: overlapSeconds({
      startMs: startedAtMs,
      endMs: lastSeenAtMs ?? startedAtMs,
      windowStartMs: input.windowStartMs,
      windowEndMs: input.windowEndMs,
    }),
    eventCount: 0,
  };
}

function buildAnalyticsSession(events: AnalyticsSummaryEventRow[]) {
  const sorted = [...events].sort((left, right) => {
    const leftMs = toMs(left.created_at) ?? 0;
    const rightMs = toMs(right.created_at) ?? 0;
    return leftMs - rightMs;
  });

  return {
    sessionId: sorted[0]?.session_id ?? "",
    source: "web" as const,
    streamId: pickLastNonEmpty(sorted.map((event) => event.stream_id)),
    deviceType: normalizeDeviceType(
      pickLastNonEmpty(sorted.map((event) => event.device_type))
    ),
    startedAt: cleanId(sorted[0]?.created_at ?? null),
    lastSeenAt: cleanId(sorted[sorted.length - 1]?.created_at ?? null),
    watchSeconds: estimateAnalyticsWatchSeconds(sorted),
    eventCount: sorted.length,
  };
}

export function buildUnifiedAnalyticsSessions(input: {
  events: AnalyticsSummaryEventRow[];
  playbackSessions: PlaybackSessionFallbackRow[];
  channelToStreamId?: Map<string, string>;
  streamIdOverride?: string | null;
  windowStartIso: string;
  windowEndIso: string;
}) {
  const windowStartMs = toMs(input.windowStartIso) ?? 0;
  const windowEndMs = toMs(input.windowEndIso) ?? Date.now();
  const playbackSessionIds = new Set(input.playbackSessions.map((row) => row.id));

  const sessions: UnifiedAnalyticsSession[] = input.playbackSessions.map((row) =>
    buildPlaybackSession(row, {
      channelToStreamId: input.channelToStreamId,
      streamIdOverride: input.streamIdOverride,
      windowStartMs,
      windowEndMs,
    })
  );

  const groupedEvents = new Map<string, AnalyticsSummaryEventRow[]>();
  for (const event of input.events) {
    if (!event.session_id || playbackSessionIds.has(event.session_id)) continue;
    const items = groupedEvents.get(event.session_id) ?? [];
    items.push(event);
    groupedEvents.set(event.session_id, items);
  }

  for (const grouped of groupedEvents.values()) {
    sessions.push(buildAnalyticsSession(grouped));
  }

  return sessions.sort((left, right) => {
    const leftMs = toMs(left.lastSeenAt) ?? toMs(left.startedAt) ?? 0;
    const rightMs = toMs(right.lastSeenAt) ?? toMs(right.startedAt) ?? 0;
    return rightMs - leftMs;
  });
}

export function buildPlatformDistribution(sessions: UnifiedAnalyticsSession[]): PlatformBreakdownEntry[] {
  const totals = {
    mobile_app: { sessions: 0, watchSeconds: 0 },
    web: { sessions: 0, watchSeconds: 0 },
  };

  for (const session of sessions) {
    totals[session.source].sessions += 1;
    totals[session.source].watchSeconds += Math.max(0, session.watchSeconds);
  }

  const totalSessions = totals.mobile_app.sessions + totals.web.sessions;

  const entries: PlatformBreakdownEntry[] = [
    {
      name: "App mobile",
      value: totalSessions ? Math.round((totals.mobile_app.sessions / totalSessions) * 100) : 0,
      sessions: totals.mobile_app.sessions,
      watchTime: Math.round(totals.mobile_app.watchSeconds / 60),
      watchTimeSeconds: totals.mobile_app.watchSeconds,
      watchTimeLabel: formatWatchDurationSeconds(totals.mobile_app.watchSeconds),
      color: "#10b981",
    },
    {
      name: "Web",
      value: totalSessions ? Math.round((totals.web.sessions / totalSessions) * 100) : 0,
      sessions: totals.web.sessions,
      watchTime: Math.round(totals.web.watchSeconds / 60),
      watchTimeSeconds: totals.web.watchSeconds,
      watchTimeLabel: formatWatchDurationSeconds(totals.web.watchSeconds),
      color: "#6366f1",
    },
  ];

  return entries.filter((entry) => entry.sessions > 0);
}

export function countPlaybackOnlySessions(
  events: AnalyticsSummaryEventRow[],
  playbackSessions: PlaybackSessionFallbackRow[]
) {
  const analyticsSessionIds = new Set(events.map((event) => event.session_id));
  return playbackSessions.filter((row) => !analyticsSessionIds.has(row.id)).length;
}

export function buildTrafficSourceTimestamps(input: {
  events: AnalyticsSummaryEventRow[];
  playbackSessions: PlaybackSessionFallbackRow[];
}) {
  const analyticsSessionIds = new Set(input.events.map((event) => event.session_id));
  const timestamps = input.events.map((event) => event.created_at);

  for (const row of input.playbackSessions) {
    if (analyticsSessionIds.has(row.id)) continue;
    const timestamp = row.last_heartbeat_at ?? row.ended_at ?? row.started_at;
    if (timestamp) timestamps.push(timestamp);
  }

  return timestamps;
}

export function buildPlaybackOnlyRecentEvents(
  events: AnalyticsSummaryEventRow[],
  playbackSessions: PlaybackSessionFallbackRow[]
) {
  const analyticsSessionIds = new Set(events.map((event) => event.session_id));

  return playbackSessions
    .filter((row) => !analyticsSessionIds.has(row.id))
    .map((row) => ({
      message: "Session mobile detectee",
      created_at: row.last_heartbeat_at ?? row.ended_at ?? row.started_at,
    }))
    .filter((row) => Boolean(row.created_at));
}

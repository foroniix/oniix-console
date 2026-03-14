export type PlaybackAnalyticsEvent = {
  session_id: string;
  tenant_id: string;
  channel_id: string;
  ts: string;
  event_type: string;
};

export type ChannelPresenceSnapshot = {
  session_id: string;
  tenant_id: string;
  channel_id: string;
  last_seen_at: string;
  is_playing: boolean;
};

export type ChannelMinuteStat = {
  tenant_id: string;
  channel_id: string;
  bucket_minute: string;
  active_viewers: number;
  sessions_started: number;
  watch_seconds: number;
  buffer_seconds: number;
  error_count: number;
  plays: number;
};

type AggregatePlaybackEventsInput = {
  events: PlaybackAnalyticsEvent[];
  presence?: ChannelPresenceSnapshot[];
  now?: Date;
  maxGapSeconds?: number;
};

type SessionMode = "idle" | "playing" | "buffering";

type SessionState = {
  lastTimestampMs: number | null;
  mode: SessionMode;
};

type BucketAccumulator = ChannelMinuteStat & {
  activeSessions: Set<string>;
};

function minuteBucket(date: Date) {
  const bucket = new Date(date);
  bucket.setUTCSeconds(0, 0);
  return bucket.toISOString();
}

function eventBucket(ts: string) {
  return minuteBucket(new Date(ts));
}

function normalizeEventType(value: string) {
  return value.trim().toLowerCase();
}

function createBucket(tenantId: string, channelId: string, bucketMinute: string): BucketAccumulator {
  return {
    tenant_id: tenantId,
    channel_id: channelId,
    bucket_minute: bucketMinute,
    active_viewers: 0,
    sessions_started: 0,
    watch_seconds: 0,
    buffer_seconds: 0,
    error_count: 0,
    plays: 0,
    activeSessions: new Set<string>(),
  };
}

function accumulateDuration(
  buckets: Map<string, BucketAccumulator>,
  event: PlaybackAnalyticsEvent,
  sessionId: string,
  startMs: number,
  endMs: number,
  mode: SessionMode
) {
  if (mode === "idle") return;
  if (endMs <= startMs) return;

  let cursor = startMs;
  while (cursor < endMs) {
    const cursorDate = new Date(cursor);
    const bucketMinute = minuteBucket(cursorDate);
    const bucketEnd = new Date(bucketMinute).getTime() + 60_000;
    const sliceEnd = Math.min(bucketEnd, endMs);
    const seconds = Math.max(0, Math.floor((sliceEnd - cursor) / 1000));
    if (seconds > 0) {
      const bucketKey = `${event.tenant_id}:${event.channel_id}:${bucketMinute}`;
      const bucket =
        buckets.get(bucketKey) ?? createBucket(event.tenant_id, event.channel_id, bucketMinute);
      if (mode === "playing") {
        bucket.watch_seconds += seconds;
        bucket.activeSessions.add(sessionId);
      } else if (mode === "buffering") {
        bucket.buffer_seconds += seconds;
      }
      buckets.set(bucketKey, bucket);
    }
    cursor = sliceEnd;
  }
}

function markActiveSession(
  buckets: Map<string, BucketAccumulator>,
  event: PlaybackAnalyticsEvent,
  sessionId: string
) {
  const bucketMinute = eventBucket(event.ts);
  const bucketKey = `${event.tenant_id}:${event.channel_id}:${bucketMinute}`;
  const bucket = buckets.get(bucketKey) ?? createBucket(event.tenant_id, event.channel_id, bucketMinute);
  bucket.activeSessions.add(sessionId);
  buckets.set(bucketKey, bucket);
}

export function aggregatePlaybackEvents(input: AggregatePlaybackEventsInput) {
  const maxGapSeconds = input.maxGapSeconds ?? 30;
  const maxGapMs = Math.max(1, maxGapSeconds) * 1000;
  const buckets = new Map<string, BucketAccumulator>();
  const sessionStates = new Map<string, SessionState>();

  const events = [...input.events].sort((left, right) => {
    const sessionCompare = left.session_id.localeCompare(right.session_id);
    if (sessionCompare !== 0) return sessionCompare;
    return new Date(left.ts).getTime() - new Date(right.ts).getTime();
  });

  for (const event of events) {
    const key = `${event.tenant_id}:${event.channel_id}:${event.session_id}`;
    const state = sessionStates.get(key) ?? { lastTimestampMs: null, mode: "idle" as SessionMode };
    const currentMs = new Date(event.ts).getTime();
    if (!Number.isFinite(currentMs)) continue;

    if (state.lastTimestampMs !== null && currentMs > state.lastTimestampMs) {
      const cappedEnd = Math.min(currentMs, state.lastTimestampMs + maxGapMs);
      accumulateDuration(buckets, event, event.session_id, state.lastTimestampMs, cappedEnd, state.mode);
    }

    const bucketMinute = eventBucket(event.ts);
    const bucketKey = `${event.tenant_id}:${event.channel_id}:${bucketMinute}`;
    const bucket = buckets.get(bucketKey) ?? createBucket(event.tenant_id, event.channel_id, bucketMinute);
    const eventType = normalizeEventType(event.event_type);

    if (eventType === "session_start") {
      bucket.sessions_started += 1;
    }
    if (eventType === "play") {
      bucket.plays += 1;
      bucket.activeSessions.add(event.session_id);
    }
    if (eventType === "heartbeat") {
      bucket.activeSessions.add(event.session_id);
    }
    if (eventType === "error") {
      bucket.error_count += 1;
    }

    buckets.set(bucketKey, bucket);

    if (eventType === "heartbeat" && state.mode === "idle") {
      state.mode = "playing";
      markActiveSession(buckets, event, event.session_id);
    } else if (eventType === "play") {
      state.mode = "playing";
      markActiveSession(buckets, event, event.session_id);
    } else if (eventType === "buffer_start") {
      state.mode = "buffering";
    } else if (eventType === "buffer_end") {
      state.mode = "playing";
      markActiveSession(buckets, event, event.session_id);
    } else if (eventType === "pause" || eventType === "end") {
      state.mode = "idle";
    }

    state.lastTimestampMs = currentMs;
    sessionStates.set(key, state);
  }

  const currentBucketMinute = minuteBucket(input.now ?? new Date());
  const currentPresence = input.presence ?? [];
  const presenceByBucket = new Map<string, Set<string>>();
  for (const snapshot of currentPresence) {
    if (!snapshot.is_playing) continue;
    const snapshotMs = new Date(snapshot.last_seen_at).getTime();
    if (!Number.isFinite(snapshotMs)) continue;
    const bucketKey = `${snapshot.tenant_id}:${snapshot.channel_id}:${currentBucketMinute}`;
    const set = presenceByBucket.get(bucketKey) ?? new Set<string>();
    set.add(snapshot.session_id);
    presenceByBucket.set(bucketKey, set);
  }

  for (const [bucketKey, bucket] of buckets.entries()) {
    const current = presenceByBucket.get(bucketKey);
    bucket.active_viewers = Math.max(bucket.activeSessions.size, current?.size ?? 0);
    buckets.set(bucketKey, bucket);
  }

  for (const [bucketKey, sessions] of presenceByBucket.entries()) {
    if (buckets.has(bucketKey)) continue;
    const [tenantId, channelId, bucketMinute] = bucketKey.split(":");
    const bucket = createBucket(tenantId, channelId, bucketMinute);
    bucket.active_viewers = sessions.size;
    bucket.activeSessions = sessions;
    buckets.set(bucketKey, bucket);
  }

  return [...buckets.values()]
    .map(({ activeSessions, ...row }) => row)
    .sort((left, right) => left.bucket_minute.localeCompare(right.bucket_minute));
}

import { describe, expect, it } from "vitest";

import { aggregatePlaybackEvents } from "./realtime-aggregate";

describe("aggregatePlaybackEvents", () => {
  it("computes watch time, buffering, plays and active viewers per minute", () => {
    const rows = aggregatePlaybackEvents({
      now: new Date("2026-03-09T10:00:50Z"),
      events: [
        {
          session_id: "s1",
          tenant_id: "t1",
          channel_id: "c1",
          ts: "2026-03-09T10:00:00Z",
          event_type: "session_start",
        },
        {
          session_id: "s1",
          tenant_id: "t1",
          channel_id: "c1",
          ts: "2026-03-09T10:00:05Z",
          event_type: "play",
        },
        {
          session_id: "s1",
          tenant_id: "t1",
          channel_id: "c1",
          ts: "2026-03-09T10:00:20Z",
          event_type: "heartbeat",
        },
        {
          session_id: "s1",
          tenant_id: "t1",
          channel_id: "c1",
          ts: "2026-03-09T10:00:25Z",
          event_type: "buffer_start",
        },
        {
          session_id: "s1",
          tenant_id: "t1",
          channel_id: "c1",
          ts: "2026-03-09T10:00:35Z",
          event_type: "buffer_end",
        },
        {
          session_id: "s1",
          tenant_id: "t1",
          channel_id: "c1",
          ts: "2026-03-09T10:00:45Z",
          event_type: "error",
        },
      ],
      presence: [
        {
          session_id: "s1",
          tenant_id: "t1",
          channel_id: "c1",
          last_seen_at: "2026-03-09T10:00:40Z",
          is_playing: true,
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      tenant_id: "t1",
      channel_id: "c1",
      bucket_minute: "2026-03-09T10:00:00.000Z",
      active_viewers: 1,
      sessions_started: 1,
      watch_seconds: 30,
      buffer_seconds: 10,
      error_count: 1,
      plays: 1,
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  buildPlatformDistribution,
  buildTrafficSourceTimestamps,
  buildUnifiedAnalyticsSessions,
  countPlaybackOnlySessions,
} from "./analytics-summary";
import type { PlaybackSessionFallbackRow } from "./playback-session-fallback";

describe("analytics summary", () => {
  it("merges mobile playback sessions with web analytics sessions without double counting", () => {
    const playbackSessions: PlaybackSessionFallbackRow[] = [
      {
        id: "mobile-1",
        channel_id: "channel-1",
        platform: "android",
        started_at: "2026-03-16T10:00:00.000Z",
        last_heartbeat_at: "2026-03-16T10:10:00.000Z",
        ended_at: null,
      },
      {
        id: "mobile-2",
        channel_id: "channel-1",
        platform: "ios",
        started_at: "2026-03-16T11:00:00.000Z",
        last_heartbeat_at: "2026-03-16T11:05:00.000Z",
        ended_at: "2026-03-16T11:05:00.000Z",
      },
    ];

    const events = [
      {
        session_id: "mobile-1",
        stream_id: "stream-1",
        device_type: "mobile-android",
        event_type: "HEARTBEAT",
        created_at: "2026-03-16T10:02:00.000Z",
      },
      {
        session_id: "web-1",
        stream_id: "stream-1",
        device_type: "desktop",
        event_type: "START_STREAM",
        created_at: "2026-03-16T12:00:00.000Z",
      },
      {
        session_id: "web-1",
        stream_id: "stream-1",
        device_type: "desktop",
        event_type: "HEARTBEAT",
        created_at: "2026-03-16T12:00:15.000Z",
      },
      {
        session_id: "web-1",
        stream_id: "stream-1",
        device_type: "desktop",
        event_type: "HEARTBEAT",
        created_at: "2026-03-16T12:00:30.000Z",
      },
      {
        session_id: "web-1",
        stream_id: "stream-1",
        device_type: "desktop",
        event_type: "HEARTBEAT",
        created_at: "2026-03-16T12:00:45.000Z",
      },
      {
        session_id: "web-1",
        stream_id: "stream-1",
        device_type: "desktop",
        event_type: "HEARTBEAT",
        created_at: "2026-03-16T12:01:00.000Z",
      },
    ];

    const sessions = buildUnifiedAnalyticsSessions({
      events,
      playbackSessions,
      channelToStreamId: new Map([["channel-1", "stream-1"]]),
      windowStartIso: "2026-03-16T00:00:00.000Z",
      windowEndIso: "2026-03-17T00:00:00.000Z",
    });

    expect(sessions).toHaveLength(3);
    expect(sessions.map((session) => session.sessionId)).toEqual([
      "web-1",
      "mobile-2",
      "mobile-1",
    ]);
    expect(sessions.reduce((sum, session) => sum + session.watchSeconds, 0)).toBe(960);
    expect(countPlaybackOnlySessions(events, playbackSessions)).toBe(1);

    expect(buildPlatformDistribution(sessions)).toEqual([
      {
        name: "App mobile",
        value: 67,
        sessions: 2,
        watchTime: 15,
        watchTimeSeconds: 900,
        watchTimeLabel: "15m",
        color: "#10b981",
      },
      {
        name: "Web",
        value: 33,
        sessions: 1,
        watchTime: 1,
        watchTimeSeconds: 60,
        watchTimeLabel: "1m",
        color: "#6366f1",
      },
    ]);

    expect(buildTrafficSourceTimestamps({ events, playbackSessions })).toHaveLength(7);
  });

  it("clamps playback watch time to the selected period window", () => {
    const sessions = buildUnifiedAnalyticsSessions({
      events: [],
      playbackSessions: [
        {
          id: "mobile-overlap",
          channel_id: "channel-2",
          platform: "android",
          started_at: "2026-03-15T23:50:00.000Z",
          last_heartbeat_at: "2026-03-16T00:10:00.000Z",
          ended_at: null,
        },
      ],
      channelToStreamId: new Map([["channel-2", "stream-2"]]),
      windowStartIso: "2026-03-16T00:00:00.000Z",
      windowEndIso: "2026-03-16T23:59:59.000Z",
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.watchSeconds).toBe(600);
  });

  it("keeps mobile watch time when a channel filter has playback sessions but no mapped stream", () => {
    const sessions = buildUnifiedAnalyticsSessions({
      events: [],
      playbackSessions: [
        {
          id: "mobile-channel-only",
          channel_id: "channel-3",
          platform: "android",
          started_at: "2026-03-16T09:00:00.000Z",
          last_heartbeat_at: "2026-03-16T09:03:00.000Z",
          ended_at: null,
        },
      ],
      channelToStreamId: new Map(),
      windowStartIso: "2026-03-16T08:00:00.000Z",
      windowEndIso: "2026-03-16T10:00:00.000Z",
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      sessionId: "mobile-channel-only",
      source: "mobile_app",
      streamId: null,
    });
    expect(sessions[0]?.watchSeconds).toBe(180);
  });
});

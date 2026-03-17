import { describe, expect, it } from "vitest";
import {
  buildLiveSnapshotFromSessionRows,
  mergeLiveSessionRows,
  mergeLiveSnapshots,
} from "./live-snapshot-merge";

describe("live snapshot merge", () => {
  it("merges viewer and playback sessions without double counting shared session ids", () => {
    const mergedRows = mergeLiveSessionRows({
      primary: [
        {
          session_id: "shared-session",
          stream_id: "stream-1",
          last_seen_at: "2026-03-16T18:00:10.000Z",
          started_at: "2026-03-16T17:58:00.000Z",
          device_type: "mobile-android",
        },
        {
          session_id: "web-session",
          stream_id: "stream-1",
          last_seen_at: "2026-03-16T18:00:12.000Z",
          started_at: "2026-03-16T17:59:00.000Z",
          device_type: "desktop",
        },
      ],
      playback: [
        {
          session_id: "shared-session",
          stream_id: null,
          last_seen_at: "2026-03-16T18:00:20.000Z",
          started_at: "2026-03-16T17:57:30.000Z",
          device_type: null,
        },
        {
          session_id: "mobile-only",
          stream_id: "stream-2",
          last_seen_at: "2026-03-16T18:00:15.000Z",
          started_at: "2026-03-16T17:59:30.000Z",
          device_type: "mobile",
        },
      ],
    });

    expect(mergedRows).toHaveLength(3);
    expect(mergedRows.map((row) => row.session_id)).toEqual([
      "shared-session",
      "mobile-only",
      "web-session",
    ]);
    expect(mergedRows[0]).toMatchObject({
      session_id: "shared-session",
      stream_id: "stream-1",
      started_at: "2026-03-16T17:57:30.000Z",
      device_type: "mobile-android",
      last_seen_at: "2026-03-16T18:00:20.000Z",
    });
  });

  it("builds a combined live snapshot when viewer and playback both have active sessions", () => {
    const primary = buildLiveSnapshotFromSessionRows({
      sessions: [
        {
          session_id: "web-session",
          stream_id: "stream-1",
          last_seen_at: "2026-03-16T18:00:12.000Z",
          started_at: "2026-03-16T17:59:00.000Z",
          device_type: "desktop",
        },
      ],
      windowSec: 35,
      asOf: "2026-03-16T18:00:12.000Z",
      source: "viewer_sessions_live",
    });

    const playback = buildLiveSnapshotFromSessionRows({
      sessions: [
        {
          session_id: "mobile-only",
          stream_id: "stream-1",
          last_seen_at: "2026-03-16T18:00:18.000Z",
          started_at: "2026-03-16T17:59:45.000Z",
          device_type: "mobile",
        },
      ],
      windowSec: 35,
      asOf: "2026-03-16T18:00:18.000Z",
      source: "playback_sessions",
    });

    const merged = mergeLiveSnapshots({ primary, playback });

    expect(merged.source).toBe("combined_live");
    expect(merged.activeUsers).toBe(2);
    expect(merged.currentStreams).toEqual({ "stream-1": 2 });
    expect(merged.asOf).toBe("2026-03-16T18:00:18.000Z");
  });

  it("returns playback source when playback is the only live signal", () => {
    const primary = buildLiveSnapshotFromSessionRows({
      sessions: [],
      windowSec: 35,
      asOf: "2026-03-16T18:00:12.000Z",
      source: "viewer_sessions_live",
    });

    const playback = buildLiveSnapshotFromSessionRows({
      sessions: [
        {
          session_id: "mobile-only",
          stream_id: null,
          last_seen_at: "2026-03-16T18:00:18.000Z",
          started_at: "2026-03-16T17:59:45.000Z",
          device_type: "mobile",
        },
      ],
      windowSec: 35,
      asOf: "2026-03-16T18:00:18.000Z",
      source: "playback_sessions",
    });

    const merged = mergeLiveSnapshots({ primary, playback });

    expect(merged.source).toBe("playback_sessions");
    expect(merged.activeUsers).toBe(1);
  });
});

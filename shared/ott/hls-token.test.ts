import { describe, expect, it } from "vitest";

import { createPlaybackToken, verifyPlaybackToken } from "./hls-token";

describe("playback token", () => {
  it("creates and verifies a token for the expected channel", async () => {
    const nowEpochSec = 1_730_000_000;
    const created = await createPlaybackToken({
      secret: "top-secret",
      channelId: "channel-1",
      sessionId: "session-1",
      deviceId: "device-1",
      ttlSec: 90,
      nowEpochSec,
    });

    const verified = await verifyPlaybackToken({
      token: created.token,
      secret: "top-secret",
      channelId: "channel-1",
      nowEpochSec: nowEpochSec + 10,
    });

    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.payload.cid).toBe("channel-1");
      expect(verified.payload.sid).toBe("session-1");
      expect(verified.payload.did).toHaveLength(64);
    }
  });

  it("rejects a token when the channel does not match the request path", async () => {
    const created = await createPlaybackToken({
      secret: "top-secret",
      channelId: "channel-1",
      sessionId: "session-1",
      ttlSec: 90,
      nowEpochSec: 1_730_000_000,
    });

    const verified = await verifyPlaybackToken({
      token: created.token,
      secret: "top-secret",
      channelId: "channel-2",
      nowEpochSec: 1_730_000_010,
    });

    expect(verified).toEqual({ ok: false, error: "Channel mismatch." });
  });

  it("rejects an expired token", async () => {
    const created = await createPlaybackToken({
      secret: "top-secret",
      channelId: "channel-1",
      sessionId: "session-1",
      ttlSec: 60,
      nowEpochSec: 1_730_000_000,
    });

    const verified = await verifyPlaybackToken({
      token: created.token,
      secret: "top-secret",
      channelId: "channel-1",
      nowEpochSec: 1_730_000_061,
    });

    expect(verified).toEqual({ ok: false, error: "Token expired." });
  });
});

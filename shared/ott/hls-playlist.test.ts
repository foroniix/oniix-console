import { describe, expect, it } from "vitest";

import { rewriteHlsPlaylist } from "./hls-playlist";

describe("rewriteHlsPlaylist", () => {
  it("rewrites variant playlists, keys and segments to Oniix proxy URLs", async () => {
    const playlist = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1800000
low/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000
https://cdn.origin.example/high/index.m3u8
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="fr",URI="audio/index.m3u8"
`;

    const result = await rewriteHlsPlaylist({
      playlist,
      playlistUrl: "https://origin.example/master.m3u8",
      channelId: "channel-1",
      token: "token-1",
      streamBaseUrl: "https://stream.oniix.space",
      makeResourceRef: (absoluteUrl) => `opaque:${absoluteUrl}`,
    });

    expect(result.kind).toBe("master");
    expect(result.rewriteCount).toBe(3);
    expect(result.playlist).toContain("https://stream.oniix.space/hls/channel-1/index.m3u8?token=token-1&ref=opaque%3Ahttps%3A%2F%2Forigin.example%2Flow%2Findex.m3u8");
    expect(result.playlist).toContain("https://stream.oniix.space/hls/channel-1/index.m3u8?token=token-1&ref=opaque%3Ahttps%3A%2F%2Fcdn.origin.example%2Fhigh%2Findex.m3u8");
    expect(result.playlist).toContain('URI="https://stream.oniix.space/hls/channel-1/index.m3u8?token=token-1&ref=opaque%3Ahttps%3A%2F%2Forigin.example%2Faudio%2Findex.m3u8"');
  });

  it("rewrites media playlist segments and key URIs", async () => {
    const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:4
#EXT-X-KEY:METHOD=AES-128,URI="keys/live.key"
#EXTINF:4.0,
segment-0001.ts?foo=bar
`;

    const result = await rewriteHlsPlaylist({
      playlist,
      playlistUrl: "https://origin.example/live/channel/index.m3u8",
      channelId: "channel-1",
      token: "token-1",
      streamBaseUrl: "https://stream.oniix.space",
      makeResourceRef: (absoluteUrl) => `opaque:${absoluteUrl}`,
    });

    expect(result.kind).toBe("media");
    expect(result.rewriteCount).toBe(2);
    expect(result.playlist).toContain('URI="https://stream.oniix.space/hls/channel-1/live.key?token=token-1&ref=opaque%3Ahttps%3A%2F%2Forigin.example%2Flive%2Fchannel%2Fkeys%2Flive.key"');
    expect(result.playlist).toContain("https://stream.oniix.space/hls/channel-1/segment-0001.ts?token=token-1&ref=opaque%3Ahttps%3A%2F%2Forigin.example%2Flive%2Fchannel%2Fsegment-0001.ts%3Ffoo%3Dbar");
  });
});

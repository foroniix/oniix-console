import { detectPlaylistKind } from "./hls-playlist.ts";

export function resolveHlsUri(baseUrl: string, rawUri: string) {
  const trimmed = rawUri.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  return new URL(trimmed, baseUrl).toString();
}

export function pickFirstMediaPlaylistUrl(masterPlaylist: string, masterUrl: string) {
  const lines = masterPlaylist.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index].trim();
    if (!current.startsWith("#EXT-X-STREAM-INF")) continue;

    for (let lookAhead = index + 1; lookAhead < lines.length; lookAhead += 1) {
      const candidate = lines[lookAhead].trim();
      if (!candidate || candidate.startsWith("#")) continue;
      return resolveHlsUri(masterUrl, candidate);
    }
  }
  return null;
}

export function pickFirstSegmentUrl(mediaPlaylist: string, mediaUrl: string) {
  const uriAttributeMatch = mediaPlaylist.match(/#EXT-X-(MAP|PART|PRELOAD-HINT):.*URI="([^"]+)"/);
  if (uriAttributeMatch?.[2]) {
    return resolveHlsUri(mediaUrl, uriAttributeMatch[2]);
  }

  const lines = mediaPlaylist.split(/\r?\n/);
  for (const line of lines) {
    const candidate = line.trim();
    if (!candidate || candidate.startsWith("#")) continue;
    return resolveHlsUri(mediaUrl, candidate);
  }
  return null;
}

export function classifyPlaylist(playlist: string) {
  return detectPlaylistKind(playlist);
}

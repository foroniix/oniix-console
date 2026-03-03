type HlsSegment = {
  uri: string;
  duration: number;
  startMs: number | null;
  endMs: number | null;
  keyLine: string | null;
  mapLine: string | null;
  discontinuity: boolean;
};

type HlsClipInput = {
  sourceUrl: string;
  clipStartAt: string;
  clipEndAt: string;
};

export type HlsClipResult = {
  manifest: string;
  segmentCount: number;
  durationSec: number;
  sourceMediaUrl: string;
  firstProgramDateTime: string | null;
  lastProgramDateTime: string | null;
};

function parseNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseAttributes(input: string) {
  const out: Record<string, string> = {};
  const pairs = input.split(",");
  for (const pair of pairs) {
    const [rawKey, ...rest] = pair.split("=");
    const key = rawKey?.trim().toUpperCase();
    if (!key || rest.length === 0) continue;
    out[key] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
  return out;
}

function toAbsoluteUrl(baseUrl: string, value: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function absolutizeAttributeUri(line: string, baseUrl: string) {
  const match = line.match(/URI="([^"]+)"/i);
  if (!match) return line;
  const absolute = toAbsoluteUrl(baseUrl, match[1]);
  return line.replace(match[0], `URI="${absolute}"`);
}

async function fetchManifest(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new Error(`Manifest inaccessible (${response.status}).`);
  }
  return response.text();
}

function pickMediaPlaylistFromMaster(masterText: string, masterUrl: string) {
  const lines = masterText.split(/\r?\n/);
  const variants: Array<{ url: string; bandwidth: number }> = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trim() ?? "";
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
    const attrs = parseAttributes(line.slice("#EXT-X-STREAM-INF:".length));
    const bandwidth = parseNumber(attrs.BANDWIDTH ?? "0");
    const uri = lines[i + 1]?.trim() ?? "";
    if (!uri || uri.startsWith("#")) continue;
    variants.push({
      url: toAbsoluteUrl(masterUrl, uri),
      bandwidth,
    });
  }

  if (variants.length === 0) {
    throw new Error("Aucune media playlist detectee.");
  }

  variants.sort((a, b) => b.bandwidth - a.bandwidth);
  return variants[0].url;
}

async function resolveMediaPlaylist(sourceUrl: string) {
  const sourceText = await fetchManifest(sourceUrl);
  if (!sourceText.includes("#EXT-X-STREAM-INF")) {
    return {
      mediaUrl: sourceUrl,
      mediaText: sourceText,
    };
  }

  const mediaUrl = pickMediaPlaylistFromMaster(sourceText, sourceUrl);
  const mediaText = await fetchManifest(mediaUrl);
  return { mediaUrl, mediaText };
}

function parseMediaSegments(mediaText: string, mediaUrl: string) {
  const lines = mediaText.split(/\r?\n/);
  const segments: HlsSegment[] = [];
  let targetDuration = 6;

  let pendingDuration: number | null = null;
  let nextProgramDateTimeMs: number | null = null;
  let currentKeyLine: string | null = null;
  let currentMapLine: string | null = null;
  let pendingDiscontinuity = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#EXT-X-TARGETDURATION:")) {
      targetDuration = Math.max(1, Math.ceil(parseNumber(line.replace("#EXT-X-TARGETDURATION:", ""))));
      continue;
    }

    if (line.startsWith("#EXT-X-PROGRAM-DATE-TIME:")) {
      const value = line.replace("#EXT-X-PROGRAM-DATE-TIME:", "").trim();
      const ms = Date.parse(value);
      if (Number.isFinite(ms)) nextProgramDateTimeMs = ms;
      continue;
    }

    if (line.startsWith("#EXT-X-KEY:")) {
      currentKeyLine = absolutizeAttributeUri(line, mediaUrl);
      continue;
    }

    if (line.startsWith("#EXT-X-MAP:")) {
      currentMapLine = absolutizeAttributeUri(line, mediaUrl);
      continue;
    }

    if (line === "#EXT-X-DISCONTINUITY") {
      pendingDiscontinuity = true;
      continue;
    }

    if (line.startsWith("#EXTINF:")) {
      const value = line.replace("#EXTINF:", "").split(",")[0] ?? "0";
      pendingDuration = parseNumber(value);
      continue;
    }

    if (line.startsWith("#")) continue;

    const uri = toAbsoluteUrl(mediaUrl, line);
    const duration = pendingDuration ?? 0;
    const startMs = nextProgramDateTimeMs;
    const endMs = startMs !== null ? startMs + duration * 1000 : null;

    segments.push({
      uri,
      duration,
      startMs,
      endMs,
      keyLine: currentKeyLine,
      mapLine: currentMapLine,
      discontinuity: pendingDiscontinuity,
    });

    if (nextProgramDateTimeMs !== null) {
      nextProgramDateTimeMs = nextProgramDateTimeMs + duration * 1000;
    }
    pendingDuration = null;
    pendingDiscontinuity = false;
  }

  return { segments, targetDuration };
}

function selectClipSegments(segments: HlsSegment[], clipStartMs: number, clipEndMs: number) {
  return segments.filter((segment) => {
    if (segment.startMs === null) return false;
    const segmentEnd = segment.endMs ?? segment.startMs + Math.max(0, segment.duration * 1000);
    return segmentEnd > clipStartMs && segment.startMs < clipEndMs;
  });
}

function renderClipManifest(segments: HlsSegment[], fallbackTargetDuration: number) {
  const maxDuration = Math.max(fallbackTargetDuration, ...segments.map((segment) => segment.duration));
  const targetDuration = Math.max(1, Math.ceil(maxDuration));

  const lines: string[] = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "#EXT-X-PLAYLIST-TYPE:VOD",
    `#EXT-X-TARGETDURATION:${targetDuration}`,
    "#EXT-X-MEDIA-SEQUENCE:0",
  ];

  let previousKey: string | null = null;
  let previousMap: string | null = null;

  for (const segment of segments) {
    if (segment.mapLine && segment.mapLine !== previousMap) {
      lines.push(segment.mapLine);
      previousMap = segment.mapLine;
    }

    if (segment.keyLine && segment.keyLine !== previousKey) {
      lines.push(segment.keyLine);
      previousKey = segment.keyLine;
    }

    if (segment.discontinuity) {
      lines.push("#EXT-X-DISCONTINUITY");
    }

    if (segment.startMs !== null) {
      lines.push(`#EXT-X-PROGRAM-DATE-TIME:${new Date(segment.startMs).toISOString()}`);
    }

    lines.push(`#EXTINF:${segment.duration.toFixed(3)},`);
    lines.push(segment.uri);
  }

  lines.push("#EXT-X-ENDLIST");
  return lines.join("\n");
}

export async function buildHlsClip(input: HlsClipInput): Promise<HlsClipResult> {
  const clipStartMs = Date.parse(input.clipStartAt);
  const clipEndMs = Date.parse(input.clipEndAt);

  if (!Number.isFinite(clipStartMs) || !Number.isFinite(clipEndMs) || clipEndMs <= clipStartMs) {
    throw new Error("Fenetre de clip invalide.");
  }

  const { mediaUrl, mediaText } = await resolveMediaPlaylist(input.sourceUrl);
  const { segments, targetDuration } = parseMediaSegments(mediaText, mediaUrl);

  if (segments.length === 0) {
    throw new Error("Aucun segment detecte dans la media playlist.");
  }

  if (!segments.some((segment) => segment.startMs !== null)) {
    throw new Error("Impossible de clipper: #EXT-X-PROGRAM-DATE-TIME manquant.");
  }

  const selected = selectClipSegments(segments, clipStartMs, clipEndMs);
  if (selected.length === 0) {
    throw new Error("Aucun segment dans la fenetre demandee.");
  }

  const manifest = renderClipManifest(selected, targetDuration);
  const durationSec = Math.round(selected.reduce((sum, segment) => sum + Math.max(0, segment.duration), 0));

  return {
    manifest,
    segmentCount: selected.length,
    durationSec,
    sourceMediaUrl: mediaUrl,
    firstProgramDateTime:
      selected[0].startMs !== null ? new Date(selected[0].startMs).toISOString() : null,
    lastProgramDateTime:
      selected.at(-1)?.startMs !== null ? new Date(selected.at(-1)!.startMs!).toISOString() : null,
  };
}

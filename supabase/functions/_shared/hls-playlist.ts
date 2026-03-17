export type PlaylistKind = "master" | "media" | "unknown";

type RewriteHlsPlaylistInput = {
  playlist: string;
  playlistUrl: string;
  channelId: string;
  token?: string | null;
  streamBaseUrl: string;
  proxyPathPrefix?: string;
  makeResourceRef: (absoluteUrl: string) => Promise<string> | string;
};

function sanitizeFileName(pathname: string) {
  const candidate = pathname.split("/").pop() || "resource";
  const safe = candidate.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || "resource";
}

export function detectPlaylistKind(playlist: string): PlaylistKind {
  if (/#EXT-X-STREAM-INF|#EXT-X-MEDIA|#EXT-X-I-FRAME-STREAM-INF/.test(playlist)) {
    return "master";
  }
  if (/#EXTINF|#EXT-X-TARGETDURATION|#EXT-X-PART|#EXT-X-MAP/.test(playlist)) {
    return "media";
  }
  return "unknown";
}

function shouldRewriteUriLine(line: string) {
  const trimmed = line.trim();
  return Boolean(trimmed) && !trimmed.startsWith("#");
}

function resolveUri(baseUrl: string, rawUri: string) {
  const trimmed = rawUri.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  return new URL(trimmed, baseUrl).toString();
}

async function buildProxyUrl(
  absoluteUrl: string,
  input: Pick<
    RewriteHlsPlaylistInput,
    "channelId" | "token" | "streamBaseUrl" | "proxyPathPrefix" | "makeResourceRef"
  >
) {
  const parsed = new URL(absoluteUrl);
  const ref = await input.makeResourceRef(absoluteUrl);
  const pathPrefix = (input.proxyPathPrefix ?? "hls").replace(/^\/+|\/+$/g, "");
  const proxyUrl = new URL(
    `${pathPrefix}/${encodeURIComponent(input.channelId)}/${encodeURIComponent(sanitizeFileName(parsed.pathname))}`,
    input.streamBaseUrl.endsWith("/") ? input.streamBaseUrl : `${input.streamBaseUrl}/`
  );
  if (input.token?.trim()) {
    proxyUrl.searchParams.set("token", input.token.trim());
  }
  proxyUrl.searchParams.set("ref", ref);
  return proxyUrl.toString();
}

async function rewriteUriAttribute(
  line: string,
  input: Pick<
    RewriteHlsPlaylistInput,
    "playlistUrl" | "channelId" | "token" | "streamBaseUrl" | "proxyPathPrefix" | "makeResourceRef"
  >
) {
  const matches = Array.from(line.matchAll(/URI="([^"]+)"/g));
  if (matches.length === 0) return line;

  let rewritten = line;
  for (const match of matches) {
    const rawUri = match[1];
    const absoluteUrl = resolveUri(input.playlistUrl, rawUri);
    if (!absoluteUrl) continue;
    const proxyUrl = await buildProxyUrl(absoluteUrl, input);
    rewritten = rewritten.replace(`URI="${rawUri}"`, `URI="${proxyUrl}"`);
  }
  return rewritten;
}

export async function rewriteHlsPlaylist(input: RewriteHlsPlaylistInput) {
  const output: string[] = [];
  let rewriteCount = 0;

  for (const line of input.playlist.split(/\r?\n/)) {
    if (shouldRewriteUriLine(line)) {
      const absoluteUrl = resolveUri(input.playlistUrl, line);
      if (!absoluteUrl) {
        output.push(line);
        continue;
      }

      output.push(await buildProxyUrl(absoluteUrl, input));
      rewriteCount += 1;
      continue;
    }

    const rewritten = await rewriteUriAttribute(line, input);
    if (rewritten !== line) rewriteCount += 1;
    output.push(rewritten);
  }

  return {
    kind: detectPlaylistKind(input.playlist),
    playlist: `${output.join("\n").trim()}\n`,
    rewriteCount,
  };
}

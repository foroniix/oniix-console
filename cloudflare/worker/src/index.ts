import { rewriteHlsPlaylist } from "../../../shared/ott/hls-playlist";
import { createOriginRef, verifyOriginRef } from "../../../shared/ott/origin-ref";
import { verifyPlaybackToken } from "../../../shared/ott/hls-token";

type Env = {
  STREAM_BASE_URL: string;
  RESOLVE_ORIGIN_URL: string;
  WORKER_RESOLVE_ORIGIN_SECRET: string;
  HLS_TOKEN_SECRET: string;
  ORIGIN_REF_SECRET: string;
  PLAYLIST_CACHE_TTL_SEC?: string;
  SEGMENT_CACHE_TTL_SEC?: string;
};

type ResolveOriginResponse = {
  ok: true;
  channel_id: string;
  tenant_id: string;
  origin_hls_url: string;
  resolved_at: string;
};

function getTtl(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildCacheKey(request: Request, kind: "playlist" | "segment", channelId: string, ref: string | null) {
  const url = new URL(request.url);
  url.pathname = `/_cache/${kind}/${channelId}`;
  url.search = ref ? `?ref=${encodeURIComponent(ref)}` : "?ref=master";
  return new Request(url.toString(), { method: "GET" });
}

function contentTypeForPlaylist() {
  return "application/vnd.apple.mpegurl; charset=utf-8";
}

function buildClientHeaders(source: Headers, cacheControl: string) {
  const headers = new Headers();
  const passthroughHeaders = ["content-type", "content-length", "accept-ranges", "etag", "last-modified"];
  for (const header of passthroughHeaders) {
    const value = source.get(header);
    if (value) headers.set(header, value);
  }
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", cacheControl);
  return headers;
}

async function resolveOrigin(request: Request, env: Env, ctx: ExecutionContext, channelId: string) {
  const cacheKey = buildCacheKey(request, "playlist", `origin-${channelId}`, "lookup");
  const cached = await caches.default.match(cacheKey);
  if (cached) {
    return (await cached.json()) as ResolveOriginResponse;
  }

  const response = await fetch(env.RESOLVE_ORIGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-oniix-worker-secret": env.WORKER_RESOLVE_ORIGIN_SECRET,
    },
    body: JSON.stringify({ channel_id: channelId }),
  });

  if (!response.ok) {
    throw new Error(`resolve_origin returned ${response.status}`);
  }

  const payload = (await response.json()) as ResolveOriginResponse;
  const cacheable = new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "max-age=30",
    },
  });
  ctx.waitUntil(caches.default.put(cacheKey, cacheable));

  return payload;
}

function isPlaylistRequest(targetUrl: string, response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return targetUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("application/x-mpegurl");
}

function looksLikePlaylistUrl(targetUrl: string) {
  return /\.m3u8($|\?)/i.test(targetUrl);
}

function looksLikeMediaAsset(targetUrl: string) {
  return /\.(ts|m4s|mp4|aac|mp3|vtt|webvtt)($|\?)/i.test(targetUrl);
}

async function proxyPlaylist(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  channelId: string,
  token: string,
  tokenExp: number,
  targetUrl: string,
  ref: string | null
) {
  const cacheKey = buildCacheKey(request, "playlist", channelId, ref);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const originResponse = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
      Accept: "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*",
    },
  });

  if (!originResponse.ok) {
    console.warn("playlist origin fetch failed", { channelId, status: originResponse.status });
    return new Response("Origin playlist unavailable.", { status: 502 });
  }

  const playlistText = await originResponse.text();
  const rewritten = await rewriteHlsPlaylist({
    playlist: playlistText,
    playlistUrl: targetUrl,
    channelId,
    token,
    streamBaseUrl: env.STREAM_BASE_URL,
    makeResourceRef: (absoluteUrl) =>
      createOriginRef({
        secret: env.ORIGIN_REF_SECRET,
        channelId,
        url: absoluteUrl,
        exp: tokenExp,
      }),
  });

  console.log("playlist proxied", { channelId, kind: rewritten.kind, rewritten: rewritten.rewriteCount });

  const cacheTtl = getTtl(env.PLAYLIST_CACHE_TTL_SEC, 2);
  const response = new Response(rewritten.playlist, {
    status: 200,
    headers: {
      "Content-Type": contentTypeForPlaylist(),
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `public, max-age=${cacheTtl}, s-maxage=${cacheTtl}`,
    },
  });
  ctx.waitUntil(caches.default.put(cacheKey, response.clone()));

  if (request.method === "HEAD") {
    return new Response(null, {
      status: response.status,
      headers: response.headers,
    });
  }

  return response;
}

async function proxySegment(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  channelId: string,
  targetUrl: string,
  ref: string | null
) {
  const hasRange = request.headers.has("Range");
  const cacheKey = buildCacheKey(request, "segment", channelId, ref);
  if (!hasRange) {
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;
  }

  const originResponse = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers.has("Range")
      ? {
          Range: request.headers.get("Range") ?? "",
        }
      : undefined,
  });

  if (!originResponse.ok && originResponse.status !== 206) {
    console.warn("segment origin fetch failed", { channelId, status: originResponse.status });
    return new Response("Origin segment unavailable.", { status: 502 });
  }

  const cacheTtl = getTtl(env.SEGMENT_CACHE_TTL_SEC, 120);
  const response = new Response(originResponse.body, {
    status: originResponse.status,
    headers: buildClientHeaders(originResponse.headers, `public, max-age=${cacheTtl}, s-maxage=${cacheTtl}`),
  });

  if (!hasRange && request.method === "GET") {
    ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
  }

  return response;
}

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      },
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed.", { status: 405 });
  }

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/hls\/([^/]+)\/([^/]+)$/);
  if (!match) {
    return new Response("Not found.", { status: 404 });
  }

  const channelId = decodeURIComponent(match[1]);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const ref = url.searchParams.get("ref")?.trim() ?? null;

  const verifiedToken = await verifyPlaybackToken({
    token,
    secret: env.HLS_TOKEN_SECRET,
    channelId,
  });
  if (!verifiedToken.ok) {
    console.warn("invalid playback token", { channelId, error: verifiedToken.error });
    return new Response("Unauthorized.", { status: 401 });
  }

  let targetUrl: string;
  if (ref) {
    const originRef = await verifyOriginRef({
      secret: env.ORIGIN_REF_SECRET,
      channelId,
      ref,
    });
    if (!originRef.ok) {
      console.warn("invalid origin ref", { channelId, error: originRef.error });
      return new Response("Unauthorized.", { status: 401 });
    }
    targetUrl = originRef.payload.url;
  } else {
    const resolved = await resolveOrigin(request, env, ctx, channelId);
    targetUrl = resolved.origin_hls_url;
  }

  if (looksLikePlaylistUrl(targetUrl)) {
    return proxyPlaylist(request, env, ctx, channelId, token, verifiedToken.payload.exp, targetUrl, ref);
  }
  if (looksLikeMediaAsset(targetUrl)) {
    return proxySegment(request, env, ctx, channelId, targetUrl, ref);
  }

  const probeResponse = await fetch(targetUrl, {
    method: "HEAD",
  }).catch(() => null);
  if (probeResponse && isPlaylistRequest(targetUrl, probeResponse)) {
    return proxyPlaylist(request, env, ctx, channelId, token, verifiedToken.payload.exp, targetUrl, ref);
  }

  return proxySegment(request, env, ctx, channelId, targetUrl, ref);
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handleRequest(request, env, ctx);
  },
};

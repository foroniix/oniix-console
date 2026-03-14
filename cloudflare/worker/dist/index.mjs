// ../../shared/ott/hls-playlist.ts
function sanitizeFileName(pathname) {
  const candidate = pathname.split("/").pop() || "resource";
  const safe = candidate.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || "resource";
}
function detectPlaylistKind(playlist) {
  if (/#EXT-X-STREAM-INF|#EXT-X-MEDIA|#EXT-X-I-FRAME-STREAM-INF/.test(playlist)) {
    return "master";
  }
  if (/#EXTINF|#EXT-X-TARGETDURATION|#EXT-X-PART|#EXT-X-MAP/.test(playlist)) {
    return "media";
  }
  return "unknown";
}
function shouldRewriteUriLine(line) {
  const trimmed = line.trim();
  return Boolean(trimmed) && !trimmed.startsWith("#");
}
function resolveUri(baseUrl, rawUri) {
  const trimmed = rawUri.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  return new URL(trimmed, baseUrl).toString();
}
async function buildProxyUrl(absoluteUrl, input) {
  const parsed = new URL(absoluteUrl);
  const ref = await input.makeResourceRef(absoluteUrl);
  const proxyUrl = new URL(
    `/hls/${encodeURIComponent(input.channelId)}/${encodeURIComponent(sanitizeFileName(parsed.pathname))}`,
    input.streamBaseUrl
  );
  if (input.token?.trim()) {
    proxyUrl.searchParams.set("token", input.token.trim());
  }
  proxyUrl.searchParams.set("ref", ref);
  return proxyUrl.toString();
}
async function rewriteUriAttribute(line, input) {
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
async function rewriteHlsPlaylist(input) {
  const output = [];
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
    playlist: `${output.join("\n").trim()}
`,
    rewriteCount
  };
}

// ../../shared/ott/base64url.ts
var textEncoder = new TextEncoder();
var textDecoder = new TextDecoder();
function hasBuffer() {
  return typeof Buffer !== "undefined";
}
function bytesToBase64(bytes) {
  if (hasBuffer()) {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunkSize = 32768;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
function base64ToBytes(base64) {
  if (hasBuffer()) {
    return Uint8Array.from(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }
  return output;
}
function utf8ToBytes(value) {
  return textEncoder.encode(value);
}
function bytesToUtf8(value) {
  return textDecoder.decode(value);
}
function encodeBase64UrlBytes(value) {
  return bytesToBase64(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function decodeBase64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - normalized.length % 4);
  return base64ToBytes(`${normalized}${padding}`);
}
function encodeBase64UrlString(value) {
  return encodeBase64UrlBytes(utf8ToBytes(value));
}
function decodeBase64UrlToString(value) {
  return bytesToUtf8(decodeBase64UrlToBytes(value));
}
function encodeJsonBase64Url(value) {
  return encodeBase64UrlString(JSON.stringify(value));
}
function decodeJsonBase64Url(value) {
  return JSON.parse(decodeBase64UrlToString(value));
}

// ../../shared/ott/origin-ref.ts
async function importAesKey(secret) {
  const digest = await crypto.subtle.digest("SHA-256", utf8ToBytes(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function createOriginRef(input) {
  const payload = {
    v: 1,
    cid: input.channelId,
    url: input.url,
    exp: input.exp
  };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(input.secret);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    utf8ToBytes(encodeJsonBase64Url(payload))
  );
  return `${encodeBase64UrlBytes(iv)}.${encodeBase64UrlBytes(new Uint8Array(ciphertext))}`;
}
async function verifyOriginRef(input) {
  const [ivEncoded, ciphertextEncoded] = input.ref.split(".");
  if (!ivEncoded || !ciphertextEncoded) {
    return { ok: false, error: "Malformed ref." };
  }
  try {
    const key = await importAesKey(input.secret);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decodeBase64UrlToBytes(ivEncoded) },
      key,
      decodeBase64UrlToBytes(ciphertextEncoded)
    );
    const payload = decodeJsonBase64Url(new TextDecoder().decode(plaintext));
    const nowEpochSec = input.nowEpochSec ?? Math.floor(Date.now() / 1e3);
    if (payload.v !== 1) return { ok: false, error: "Unsupported ref version." };
    if (payload.cid !== input.channelId) return { ok: false, error: "Channel mismatch." };
    if (!payload.url) return { ok: false, error: "Missing origin URL." };
    if (payload.exp <= nowEpochSec) return { ok: false, error: "Ref expired." };
    return { ok: true, payload };
  } catch {
    return { ok: false, error: "Invalid ref." };
  }
}

// src/index.ts
var ORIGIN_LOOKUP_CACHE_TTL_SEC = 300;
var DEFAULT_UNSECURED_REF_TTL_SEC = 60 * 60 * 12;
function getTtl(value, fallback) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}
async function hashCacheRef(ref) {
  if (!ref) return "master";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ref));
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}
async function buildCacheKey(request, kind, channelId, ref) {
  const url = new URL(request.url);
  url.pathname = `/_cache/${kind}/${channelId}`;
  const refKey = await hashCacheRef(ref);
  url.search = `?ref=${refKey}`;
  return new Request(url.toString(), { method: "GET" });
}
function contentTypeForPlaylist() {
  return "application/vnd.apple.mpegurl; charset=utf-8";
}
function buildClientHeaders(source, cacheControl) {
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
async function resolveOrigin(request, env, ctx, channelId) {
  const cacheKey = await buildCacheKey(request, "playlist", `origin-${channelId}`, "lookup");
  const cached = await caches.default.match(cacheKey);
  if (cached) {
    return await cached.json();
  }
  const response = await fetch(env.RESOLVE_ORIGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-oniix-worker-secret": env.WORKER_RESOLVE_ORIGIN_SECRET
    },
    body: JSON.stringify({ channel_id: channelId })
  });
  if (!response.ok) {
    throw new Error(`resolve_origin returned ${response.status}`);
  }
  const payload = await response.json();
  const cacheable = new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `max-age=${ORIGIN_LOOKUP_CACHE_TTL_SEC}`
    }
  });
  ctx.waitUntil(caches.default.put(cacheKey, cacheable));
  return payload;
}
function isPlaylistRequest(targetUrl, response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return targetUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("application/x-mpegurl");
}
function looksLikePlaylistUrl(targetUrl) {
  return /\.m3u8($|\?)/i.test(targetUrl);
}
function looksLikeMediaAsset(targetUrl) {
  return /\.(ts|m4s|mp4|aac|mp3|vtt|webvtt)($|\?)/i.test(targetUrl);
}
async function proxyPlaylist(request, env, ctx, channelId, token, refExp, targetUrl, ref) {
  const cacheKey = await buildCacheKey(request, "playlist", channelId, ref);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;
  const originResponse = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
      Accept: "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*"
    }
  }).catch((error) => {
    console.warn("playlist origin fetch exception", { channelId, targetUrl, error: String(error) });
    return null;
  });
  if (!originResponse) {
    return new Response("Origin playlist unavailable.", { status: 502 });
  }
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
    makeResourceRef: (absoluteUrl) => createOriginRef({
      secret: env.ORIGIN_REF_SECRET,
      channelId,
      url: absoluteUrl,
      exp: refExp
    })
  });
  console.log("playlist proxied", { channelId, kind: rewritten.kind, rewritten: rewritten.rewriteCount });
  const mediaPlaylistTtl = getTtl(env.PLAYLIST_CACHE_TTL_SEC, 2);
  const cacheTtl = rewritten.kind === "master" ? Math.max(mediaPlaylistTtl, 30) : mediaPlaylistTtl;
  const response = new Response(rewritten.playlist, {
    status: 200,
    headers: {
      "Content-Type": contentTypeForPlaylist(),
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `public, max-age=${cacheTtl}, s-maxage=${cacheTtl}`
    }
  });
  ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
  if (request.method === "HEAD") {
    return new Response(null, {
      status: response.status,
      headers: response.headers
    });
  }
  return response;
}
async function proxySegment(request, env, ctx, channelId, targetUrl, ref) {
  const hasRange = request.headers.has("Range");
  const cacheKey = await buildCacheKey(request, "segment", channelId, ref);
  if (!hasRange) {
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;
  }
  const originResponse = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers.has("Range") ? {
      Range: request.headers.get("Range") ?? ""
    } : void 0
  }).catch((error) => {
    console.warn("segment origin fetch exception", { channelId, targetUrl, error: String(error) });
    return null;
  });
  if (!originResponse) {
    return new Response("Origin segment unavailable.", { status: 502 });
  }
  if (!originResponse.ok && originResponse.status !== 206) {
    console.warn("segment origin fetch failed", { channelId, status: originResponse.status });
    return new Response("Origin segment unavailable.", { status: 502 });
  }
  const cacheTtl = getTtl(env.SEGMENT_CACHE_TTL_SEC, 120);
  const response = new Response(originResponse.body, {
    status: originResponse.status,
    headers: buildClientHeaders(originResponse.headers, `public, max-age=${cacheTtl}, s-maxage=${cacheTtl}`)
  });
  if (!hasRange && request.method === "GET") {
    ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
  }
  return response;
}
async function handleRequest(request, env, ctx) {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS"
      }
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
  const token = url.searchParams.get("token")?.trim() || null;
  const ref = url.searchParams.get("ref")?.trim() ?? null;
  const refExp = Math.floor(Date.now() / 1e3) + DEFAULT_UNSECURED_REF_TTL_SEC;
  let targetUrl;
  if (ref) {
    const originRef = await verifyOriginRef({
      secret: env.ORIGIN_REF_SECRET,
      channelId,
      ref
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
    return proxyPlaylist(request, env, ctx, channelId, token, refExp, targetUrl, ref);
  }
  if (looksLikeMediaAsset(targetUrl)) {
    return proxySegment(request, env, ctx, channelId, targetUrl, ref);
  }
  const probeResponse = await fetch(targetUrl, {
    method: "HEAD"
  }).catch(() => null);
  if (probeResponse && isPlaylistRequest(targetUrl, probeResponse)) {
    return proxyPlaylist(request, env, ctx, channelId, token, refExp, targetUrl, ref);
  }
  return proxySegment(request, env, ctx, channelId, targetUrl, ref);
}
var index_default = {
  fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};
export {
  index_default as default
};

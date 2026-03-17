import { NextResponse } from "next/server";
import { rewriteHlsPlaylist } from "../../../../../../../shared/ott/hls-playlist";
import {
  getPlaybackBaseUrl,
  makePlaybackOriginRef,
  readPlaybackOriginRef,
  resolvePlaybackChannel,
  verifyPlaybackAccessToken,
} from "../../../../_utils/playback";
import { supabaseAdmin } from "../../../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function copyHeader(
  target: Headers,
  source: Headers,
  key: string,
  rename?: string
) {
  const value = source.get(key);
  if (value) target.set(rename ?? key, value);
}

function isPlaylistRequest(fileName: string, contentType: string | null) {
  if (fileName.toLowerCase().endsWith(".m3u8")) return true;
  const normalizedType = (contentType ?? "").toLowerCase();
  return normalizedType.includes("mpegurl") || normalizedType.includes("application/vnd.apple.mpegurl");
}

async function proxyRequest(
  req: Request,
  params: { channelId: string; fileName: string },
  method: "GET" | "HEAD"
) {
  const channelId = params.channelId.trim();
  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
  const ref = new URL(req.url).searchParams.get("ref")?.trim() ?? "";

  if (!channelId || !token) {
    return NextResponse.json({ ok: false, error: "Authentification playback invalide." }, { status: 401 });
  }

  const tokenRes = await verifyPlaybackAccessToken(channelId, token);
  if (!tokenRes.ok) {
    return NextResponse.json({ ok: false, error: "Authentification playback invalide." }, { status: 401 });
  }

  const admin = supabaseAdmin();
  let originUrl = "";
  if (ref) {
    const refRes = await readPlaybackOriginRef(channelId, ref);
    if (!refRes.ok) {
      return NextResponse.json({ ok: false, error: "Reference playback invalide." }, { status: 401 });
    }
    originUrl = refRes.payload.url;
  } else {
    const { data: channel, error: channelError } = await admin
      .from("channels")
      .select("id, tenant_id, origin_hls_url, active, is_active")
      .eq("id", channelId)
      .maybeSingle();

    if (channelError) {
      console.error("Playback root channel lookup error", {
        error: channelError.message,
        code: channelError.code,
        channelId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    if (!channel) {
      return NextResponse.json({ ok: false, error: "Ressource introuvable." }, { status: 404 });
    }

    const resolved = await resolvePlaybackChannel(admin, {
      tenantId: String((channel as { tenant_id?: string | null }).tenant_id ?? ""),
      channelId,
    });
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: resolved.error }, { status: resolved.status });
    }
    originUrl = resolved.value.originHlsUrl;
  }

  const upstreamHeaders = new Headers();
  copyHeader(upstreamHeaders, req.headers, "range");
  copyHeader(upstreamHeaders, req.headers, "if-none-match");
  copyHeader(upstreamHeaders, req.headers, "if-modified-since");
  copyHeader(upstreamHeaders, req.headers, "user-agent");
  copyHeader(upstreamHeaders, req.headers, "accept");

  const originRes = await fetch(originUrl, {
    method,
    headers: upstreamHeaders,
    redirect: "follow",
    cache: "no-store",
  });

  if (method === "HEAD") {
    const headers = new Headers();
    copyHeader(headers, originRes.headers, "content-type");
    copyHeader(headers, originRes.headers, "content-length");
    copyHeader(headers, originRes.headers, "accept-ranges");
    copyHeader(headers, originRes.headers, "etag");
    copyHeader(headers, originRes.headers, "last-modified");
    headers.set("Cache-Control", isPlaylistRequest(params.fileName, originRes.headers.get("content-type")) ? "no-store" : "public, max-age=30");
    return new Response(null, { status: originRes.status, headers });
  }

  if (!originRes.ok) {
    return new Response(originRes.body, {
      status: originRes.status,
      headers: {
        "Content-Type": originRes.headers.get("content-type") ?? "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const isPlaylist = isPlaylistRequest(params.fileName, originRes.headers.get("content-type"));

  if (!isPlaylist) {
    const headers = new Headers();
    copyHeader(headers, originRes.headers, "content-type");
    copyHeader(headers, originRes.headers, "content-length");
    copyHeader(headers, originRes.headers, "accept-ranges");
    copyHeader(headers, originRes.headers, "etag");
    copyHeader(headers, originRes.headers, "last-modified");
    headers.set("Cache-Control", "public, max-age=30");
    return new Response(originRes.body, {
      status: originRes.status,
      headers,
    });
  }

  if (method === "GET") {
    const nowIso = new Date().toISOString();
    const { error: touchError } = await admin
      .from("playback_sessions")
      .update({ last_heartbeat_at: nowIso })
      .eq("id", tokenRes.payload.sid)
      .eq("channel_id", channelId)
      .is("ended_at", null);

    if (touchError) {
      console.error("Playback HLS session touch error", {
        error: touchError.message,
        code: touchError.code,
        channelId,
        sessionId: tokenRes.payload.sid,
      });
    }
  }

  const playlist = await originRes.text();
  const playbackBaseUrl = getPlaybackBaseUrl(req);
  const rewritten = await rewriteHlsPlaylist({
    playlist,
    playlistUrl: originUrl,
    channelId,
    token,
    streamBaseUrl: playbackBaseUrl,
    proxyPathPrefix: "hls",
    makeResourceRef: (absoluteUrl) =>
      makePlaybackOriginRef(channelId, absoluteUrl, tokenRes.payload.exp),
  });

  return new Response(rewritten.playlist, {
    status: originRes.status,
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ channelId: string; file: string }> }
) {
  const resolved = await params;
  return proxyRequest(req, { channelId: resolved.channelId, fileName: resolved.file }, "GET");
}

export async function HEAD(
  req: Request,
  { params }: { params: Promise<{ channelId: string; file: string }> }
) {
  const resolved = await params;
  return proxyRequest(req, { channelId: resolved.channelId, fileName: resolved.file }, "HEAD");
}

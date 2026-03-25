import { NextResponse } from "next/server";
import { z } from "zod";

import { createIngestToken } from "../../../_utils/ingest-token";
import { createSignedPlaybackAccess, resolvePlaybackChannel } from "../../../_utils/playback";
import { supabaseAdmin } from "../../../_utils/supabase";
import { parseJson } from "../../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_SCHEMA = z
  .object({
    stream_id: z.string().optional(),
    channel_id: z.string().optional(),
    session_id: z.string().uuid().optional().nullable(),
    device_id: z.string().min(1).max(256).optional(),
  })
  .refine((value) => Boolean(value.stream_id?.trim() || value.channel_id?.trim()), {
    message: "stream_id or channel_id is required",
    path: ["stream_id"],
  });

function clean(value?: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function firstHeaderValue(headerValue: string | null) {
  return (headerValue ?? "").split(",")[0]?.trim() || null;
}

export async function POST(req: Request) {
  const parsed = await parseJson(req, REQUEST_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const admin = supabaseAdmin();
  const requestedStreamId = clean(parsed.data.stream_id);
  const requestedChannelId = clean(parsed.data.channel_id);
  let tenantId: string | null = null;
  let effectiveStreamId = requestedStreamId;
  let effectiveChannelId = requestedChannelId;

  if (requestedStreamId) {
    const { data: stream, error: streamError } = await admin
      .from("streams")
      .select("id,tenant_id,channel_id,status")
      .eq("id", requestedStreamId)
      .maybeSingle();

    if (streamError) {
      console.error("Web playback stream lookup error", {
        error: streamError.message,
        code: streamError.code,
        streamId: requestedStreamId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    if (!stream) {
      return NextResponse.json({ ok: false, error: "Direct introuvable." }, { status: 404 });
    }

    if (String(stream.status ?? "").toUpperCase() !== "LIVE") {
      return NextResponse.json({ ok: false, error: "Ce direct n'est pas actif." }, { status: 409 });
    }

    tenantId = clean((stream as { tenant_id?: string | null }).tenant_id);
    effectiveChannelId = clean((stream as { channel_id?: string | null }).channel_id) ?? requestedChannelId;
  } else if (requestedChannelId) {
    const { data: stream, error: streamError } = await admin
      .from("streams")
      .select("id,tenant_id,channel_id,status,updated_at")
      .eq("channel_id", requestedChannelId)
      .eq("status", "LIVE")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (streamError) {
      console.error("Web playback channel stream lookup error", {
        error: streamError.message,
        code: streamError.code,
        channelId: requestedChannelId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    if (!stream) {
      return NextResponse.json({ ok: false, error: "Aucun direct actif pour cette chaîne." }, { status: 404 });
    }

    tenantId = clean((stream as { tenant_id?: string | null }).tenant_id);
    effectiveStreamId = clean((stream as { id?: string | null }).id);
    effectiveChannelId = requestedChannelId;
  }

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Configuration invalide." }, { status: 500 });
  }

  const playbackRes = await resolvePlaybackChannel(admin, {
    tenantId,
    streamId: effectiveStreamId,
    channelId: effectiveChannelId,
  });

  if (!playbackRes.ok) {
    return NextResponse.json({ ok: false, error: playbackRes.error }, { status: playbackRes.status });
  }

  const startedAt = new Date().toISOString();
  let sessionId = clean(parsed.data.session_id) ?? "";

  if (sessionId) {
    const { data: existingSession, error: existingSessionError } = await admin
      .from("playback_sessions")
      .select("id,ended_at")
      .eq("id", sessionId)
      .eq("tenant_id", tenantId)
      .eq("channel_id", playbackRes.value.channelId)
      .maybeSingle();

    if (existingSessionError) {
      console.error("Web playback session lookup error", {
        error: existingSessionError.message,
        code: existingSessionError.code,
        tenantId,
        channelId: playbackRes.value.channelId,
        sessionId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    if (!existingSession || existingSession.ended_at) {
      sessionId = "";
    } else {
      const { error: touchError } = await admin
        .from("playback_sessions")
        .update({
          app_version: "web",
          network_type: "unknown",
          last_heartbeat_at: startedAt,
        })
        .eq("id", sessionId);

      if (touchError) {
        console.error("Web playback session touch error", {
          error: touchError.message,
          code: touchError.code,
          sessionId,
        });
      }
    }
  }

  if (!sessionId) {
    const { data: session, error: sessionError } = await admin
      .from("playback_sessions")
      .insert({
        tenant_id: tenantId,
        channel_id: playbackRes.value.channelId,
        device_id: parsed.data.device_id ?? null,
        platform: "web",
        app_version: "web",
        network_type: "unknown",
        started_at: startedAt,
        last_heartbeat_at: startedAt,
        client_ip: firstHeaderValue(req.headers.get("x-forwarded-for")),
        country:
          firstHeaderValue(req.headers.get("x-vercel-ip-country")) ||
          firstHeaderValue(req.headers.get("cf-ipcountry")),
        asn: req.headers.get("x-vercel-ip-as-number") ?? req.headers.get("cf-asn"),
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("Web playback session create error", {
        error: sessionError?.message ?? "unknown",
        code: sessionError?.code ?? null,
        tenantId,
        channelId: playbackRes.value.channelId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    sessionId = session.id;
  }

  const ingestToken = createIngestToken({
    tenantId,
    streamId: playbackRes.value.streamId,
    ttlSec: 900,
  });

  if (!ingestToken.ok) {
    return NextResponse.json({ ok: false, error: "Ingest non configuré." }, { status: 503 });
  }

  const signedAccess = await createSignedPlaybackAccess({
    request: req,
    channelId: playbackRes.value.channelId,
    sessionId,
    deviceId: parsed.data.device_id ?? null,
  });

  return NextResponse.json(
    {
      ok: true,
      tenant_id: tenantId,
      channel_id: playbackRes.value.channelId,
      stream_id: playbackRes.value.streamId,
      session_id: sessionId,
      playback_url: signedAccess.playbackUrl.toString(),
      expires_at: signedAccess.expiresAt,
      runtime_token: ingestToken.token,
      runtime_expires_at: ingestToken.expiresAt,
    },
    { status: 200 }
  );
}

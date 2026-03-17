import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSignedPlaybackAccess,
  resolvePlaybackChannel,
} from "../../_utils/playback";
import { supabaseAdmin } from "../../_utils/supabase";
import { requireTenantIngestAuth } from "../../_utils/tenant-ingest-auth";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_SCHEMA = z
  .object({
    channel_id: z.string().optional(),
    stream_id: z.string().optional(),
    session_id: z.string().uuid().optional().nullable(),
    platform: z.enum(["ios", "android"]).optional(),
    device_id: z.string().min(1).max(256).optional(),
    app_version: z.string().max(64).optional(),
    network_type: z.enum(["wifi", "4g", "5g", "unknown"]).optional(),
  })
  .refine((value) => Boolean(value.channel_id?.trim() || value.stream_id?.trim()), {
    message: "channel_id or stream_id is required",
    path: ["channel_id"],
  });

function firstHeaderValue(headerValue: string | null) {
  return (headerValue ?? "").split(",")[0]?.trim() || null;
}

export async function POST(req: Request) {
  const tenantAuth = await requireTenantIngestAuth(req);
  if (!tenantAuth.ok) return tenantAuth.res;

  const parsed = await parseJson(req, REQUEST_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const admin = supabaseAdmin();
  const effectiveStreamId = parsed.data.stream_id?.trim() || tenantAuth.streamId?.trim() || null;

  if (tenantAuth.keySource === "token" && tenantAuth.streamId && effectiveStreamId !== tenantAuth.streamId.trim()) {
    return NextResponse.json({ ok: false, error: "Authentification playback invalide." }, { status: 401 });
  }

  const playbackRes = await resolvePlaybackChannel(admin, {
    tenantId: tenantAuth.tenantId,
    streamId: effectiveStreamId,
    channelId: parsed.data.channel_id?.trim() ?? null,
  });

  if (!playbackRes.ok) {
    return NextResponse.json({ ok: false, error: playbackRes.error }, { status: playbackRes.status });
  }

  const { channelId, tenantId } = playbackRes.value;
  const startedAt = new Date().toISOString();
  let sessionId = parsed.data.session_id?.trim() ?? "";

  if (sessionId) {
    const { data: existingSession, error: existingSessionError } = await admin
      .from("playback_sessions")
      .select("id, ended_at")
      .eq("id", sessionId)
      .eq("tenant_id", tenantId)
      .eq("channel_id", channelId)
      .maybeSingle();

    if (existingSessionError) {
      console.error("Playback session lookup error", {
        error: existingSessionError.message,
        code: existingSessionError.code,
        tenantId,
        channelId,
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
          app_version: parsed.data.app_version ?? null,
          network_type: parsed.data.network_type ?? "unknown",
          last_heartbeat_at: startedAt,
        })
        .eq("id", sessionId);

      if (touchError) {
        console.error("Playback session touch error", {
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
        channel_id: channelId,
        device_id: parsed.data.device_id ?? null,
        platform: parsed.data.platform ?? "android",
        app_version: parsed.data.app_version ?? null,
        network_type: parsed.data.network_type ?? "unknown",
        started_at: startedAt,
        last_heartbeat_at: startedAt,
        client_ip: firstHeaderValue(req.headers.get("x-forwarded-for")),
        country: req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry"),
        asn: req.headers.get("x-vercel-ip-as-number") ?? req.headers.get("cf-asn"),
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("Playback session create error", {
        error: sessionError?.message ?? "unknown",
        code: sessionError?.code ?? null,
        tenantId,
        channelId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    sessionId = session.id;
  }

  const signedAccess = await createSignedPlaybackAccess({
    request: req,
    channelId,
    sessionId,
    deviceId: parsed.data.device_id ?? null,
  });

  return NextResponse.json(
    {
      ok: true,
      tenant_id: tenantId,
      channel_id: channelId,
      stream_id: playbackRes.value.streamId,
      session_id: sessionId,
      playback_url: signedAccess.playbackUrl.toString(),
      expires_at: signedAccess.expiresAt,
    },
    { status: 200 }
  );
}

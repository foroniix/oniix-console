import { z } from "npm:zod@4";

import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { createPlaybackToken } from "../_shared/hls-token.ts";

const requestSchema = z.object({
  channel_id: z.string().uuid(),
  session_id: z.string().uuid().optional().nullable(),
  platform: z.enum(["ios", "android"]),
  device_id: z.string().min(1).max(256).optional(),
  app_version: z.string().max(64).optional(),
  network_type: z.enum(["wifi", "4g", "5g", "unknown"]).optional(),
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, { status: 405 });

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid request body.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: channel, error: channelError } = await admin
    .from("channels")
    .select("id, tenant_id, origin_hls_url, is_active, active")
    .eq("id", body.channel_id)
    .maybeSingle();

  if (channelError) {
    console.error("get_playback_url channel lookup failed", channelError);
    return jsonResponse({ ok: false, error: "Channel lookup failed." }, { status: 500 });
  }

  if (!channel) {
    return jsonResponse({ ok: false, error: "Channel not found." }, { status: 404 });
  }

  const isActive = Boolean((channel as Record<string, unknown>).is_active ?? (channel as Record<string, unknown>).active);
  const originHlsUrl = String((channel as Record<string, unknown>).origin_hls_url ?? "").trim();
  if (!isActive) {
    return jsonResponse({ ok: false, error: "Channel is inactive." }, { status: 403 });
  }
  if (!originHlsUrl) {
    return jsonResponse({ ok: false, error: "Channel origin is not configured." }, { status: 409 });
  }

  const startedAt = new Date().toISOString();
  let sessionId = body.session_id?.trim() ?? "";

  if (sessionId) {
    const { data: existingSession, error: existingSessionError } = await admin
      .from("playback_sessions")
      .select("id, ended_at")
      .eq("id", sessionId)
      .eq("tenant_id", channel.tenant_id)
      .eq("channel_id", channel.id)
      .maybeSingle();

    if (existingSessionError) {
      console.error("get_playback_url existing session lookup failed", existingSessionError);
      return jsonResponse({ ok: false, error: "Unable to refresh playback session." }, { status: 500 });
    }

    if (!existingSession || existingSession.ended_at) {
      sessionId = "";
    } else {
      const { error: touchError } = await admin
        .from("playback_sessions")
        .update({
          app_version: body.app_version ?? null,
          network_type: body.network_type ?? "unknown",
          last_heartbeat_at: startedAt,
        })
        .eq("id", sessionId);

      if (touchError) {
        console.error("get_playback_url session touch failed", touchError);
      }
    }
  }

  if (!sessionId) {
    const { data: session, error: sessionError } = await admin
      .from("playback_sessions")
      .insert({
        tenant_id: channel.tenant_id,
        channel_id: channel.id,
        device_id: body.device_id ?? null,
        platform: body.platform,
        app_version: body.app_version ?? null,
        network_type: body.network_type ?? "unknown",
        started_at: startedAt,
        last_heartbeat_at: startedAt,
        client_ip: request.headers.get("x-forwarded-for") ?? request.headers.get("cf-connecting-ip"),
        country: request.headers.get("cf-ipcountry"),
        asn: request.headers.get("cf-asn"),
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("get_playback_url session insert failed", sessionError);
      return jsonResponse({ ok: false, error: "Unable to create playback session." }, { status: 500 });
    }

    sessionId = session.id;
  }

  const token = await createPlaybackToken({
    secret: env.hlsTokenSecret,
    channelId: channel.id,
    sessionId,
    deviceId: body.device_id ?? null,
    ttlSec: env.playbackTokenTtlSec,
  });

  const playbackUrl = new URL(`/hls/${channel.id}/master.m3u8`, env.streamBaseUrl);
  playbackUrl.searchParams.set("token", token.token);

  return jsonResponse({
    ok: true,
    session_id: sessionId,
    playback_url: playbackUrl.toString(),
    expires_at: token.payload.exp,
  });
});

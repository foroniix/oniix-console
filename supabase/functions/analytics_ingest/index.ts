import { z } from "npm:zod@4";

import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const eventSchema = z.object({
  session_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  event_type: z.enum(["session_start", "play", "heartbeat", "pause", "buffer_start", "buffer_end", "error", "end"]),
  ts: z.string().datetime(),
  playhead_sec: z.number().int().nonnegative().nullable().optional(),
  bitrate: z.number().int().nonnegative().nullable().optional(),
  resolution: z.string().max(32).nullable().optional(),
  network_type: z.string().max(32).nullable().optional(),
  device_model: z.string().max(128).nullable().optional(),
  os_version: z.string().max(64).nullable().optional(),
  app_version: z.string().max(64).nullable().optional(),
  error_code: z.string().max(128).nullable().optional(),
  error_detail: z.string().max(512).nullable().optional(),
  extra: z.record(z.string(), z.unknown()).nullable().optional(),
});

const requestSchema = z.object({
  events: z.array(eventSchema).min(1).max(200),
});

function isPlayingEvent(eventType: string) {
  return eventType === "play" || eventType === "heartbeat" || eventType === "buffer_end";
}

function isEndedEvent(eventType: string) {
  return eventType === "end";
}

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
        error: "Invalid analytics payload.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const sessionIds = [...new Set(body.events.map((event) => event.session_id))];
  const { data: sessions, error: sessionsError } = await admin
    .from("playback_sessions")
    .select("id, tenant_id, channel_id, ended_at")
    .in("id", sessionIds);

  if (sessionsError) {
    console.error("analytics_ingest session lookup failed", sessionsError);
    return jsonResponse({ ok: false, error: "Unable to validate sessions." }, { status: 500 });
  }

  const sessionMap = new Map(
    (sessions ?? []).map((session) => [
      String(session.id),
      {
        id: String(session.id),
        tenant_id: String(session.tenant_id),
        channel_id: String(session.channel_id),
        ended_at: session.ended_at as string | null,
      },
    ])
  );

  const validationErrors: Array<{ session_id: string; error: string }> = [];
  const rows = body.events.map((event) => {
    const session = sessionMap.get(event.session_id);
    if (!session) {
      validationErrors.push({ session_id: event.session_id, error: "Unknown session." });
      return null;
    }
    if (session.channel_id !== event.channel_id) {
      validationErrors.push({ session_id: event.session_id, error: "Channel mismatch." });
      return null;
    }

    return {
      session_id: event.session_id,
      tenant_id: session.tenant_id,
      channel_id: session.channel_id,
      ts: event.ts,
      event_type: event.event_type,
      playhead_sec: event.playhead_sec ?? null,
      bitrate: event.bitrate ?? null,
      resolution: event.resolution ?? null,
      network_type: event.network_type ?? null,
      device_model: event.device_model ?? null,
      os_version: event.os_version ?? null,
      app_version: event.app_version ?? null,
      error_code: event.error_code ?? null,
      error_detail: event.error_detail ?? null,
      extra: event.extra ?? null,
    };
  });

  if (validationErrors.length > 0) {
    return jsonResponse({ ok: false, error: "Invalid analytics events.", details: validationErrors }, { status: 400 });
  }

  const validRows = rows.filter(Boolean);
  const { error: insertError } = await admin.from("playback_events").insert(validRows);
  if (insertError) {
    console.error("analytics_ingest insert failed", insertError);
    return jsonResponse({ ok: false, error: "Unable to persist analytics events." }, { status: 500 });
  }

  const updatesBySession = new Map<
    string,
    { tenant_id: string; channel_id: string; last_seen_at: string; is_playing: boolean; ended_at: string | null }
  >();

  for (const event of body.events) {
    const session = sessionMap.get(event.session_id);
    if (!session) continue;

    const current = updatesBySession.get(event.session_id) ?? {
      tenant_id: session.tenant_id,
      channel_id: session.channel_id,
      last_seen_at: event.ts,
      is_playing: isPlayingEvent(event.event_type),
      ended_at: isEndedEvent(event.event_type) ? event.ts : null,
    };

    if (new Date(event.ts).getTime() >= new Date(current.last_seen_at).getTime()) {
      current.last_seen_at = event.ts;
      current.is_playing = isPlayingEvent(event.event_type);
      current.ended_at = isEndedEvent(event.event_type) ? event.ts : current.ended_at;
    }

    updatesBySession.set(event.session_id, current);
  }

  for (const [sessionId, update] of updatesBySession.entries()) {
    const latestEvent = body.events.filter((event) => event.session_id === sessionId).at(-1);
    const sessionPayload: Record<string, unknown> = {
      last_heartbeat_at: update.last_seen_at,
      network_type: latestEvent?.network_type ?? null,
      app_version: latestEvent?.app_version ?? null,
    };
    if (update.ended_at) {
      sessionPayload.ended_at = update.ended_at;
      sessionPayload.ended_reason = "client_end";
    }

    const { error: sessionUpdateError } = await admin
      .from("playback_sessions")
      .update(sessionPayload)
      .eq("id", sessionId);
    if (sessionUpdateError) {
      console.error("analytics_ingest session update failed", { sessionId, error: sessionUpdateError });
    }

    const { error: presenceError } = await admin.from("channel_realtime_presence").upsert(
      {
        session_id: sessionId,
        tenant_id: update.tenant_id,
        channel_id: update.channel_id,
        last_seen_at: update.last_seen_at,
        is_playing: update.is_playing && !update.ended_at,
      },
      { onConflict: "session_id" }
    );
    if (presenceError) {
      console.error("analytics_ingest presence upsert failed", { sessionId, error: presenceError });
    }
  }

  return jsonResponse({
    ok: true,
    inserted: validRows.length,
    sessions_updated: updatesBySession.size,
  });
});

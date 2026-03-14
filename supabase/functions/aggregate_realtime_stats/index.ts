import { z } from "npm:zod@4";

import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";
import { requireJobSecret } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { aggregatePlaybackEvents } from "../_shared/realtime-aggregate.ts";

const requestSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  channel_id: z.string().uuid().optional(),
  lookback_minutes: z.number().int().min(1).max(240).optional(),
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, { status: 405 });

  const secret = requireJobSecret(request);
  if (!secret.ok) return secret.res;

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json().catch(() => ({})));
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid aggregation request.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }

  const lookbackMinutes = body.lookback_minutes ?? 15;
  const now = new Date();
  const windowStart = new Date(now.getTime() - (lookbackMinutes + 1) * 60_000).toISOString();
  const presenceCutoff = new Date(now.getTime() - env.presenceWindowSeconds * 1000).toISOString();

  const admin = createAdminClient();
  let eventsQuery = admin
    .from("playback_events")
    .select("session_id, tenant_id, channel_id, ts, event_type")
    .gte("ts", windowStart)
    .order("ts", { ascending: true });

  let presenceQuery = admin
    .from("channel_realtime_presence")
    .select("session_id, tenant_id, channel_id, last_seen_at, is_playing")
    .gte("last_seen_at", presenceCutoff);

  if (body.tenant_id) {
    eventsQuery = eventsQuery.eq("tenant_id", body.tenant_id);
    presenceQuery = presenceQuery.eq("tenant_id", body.tenant_id);
  }
  if (body.channel_id) {
    eventsQuery = eventsQuery.eq("channel_id", body.channel_id);
    presenceQuery = presenceQuery.eq("channel_id", body.channel_id);
  }

  const [{ data: events, error: eventsError }, { data: presence, error: presenceError }] = await Promise.all([
    eventsQuery,
    presenceQuery,
  ]);

  if (eventsError || presenceError) {
    console.error("aggregate_realtime_stats query failed", { eventsError, presenceError });
    return jsonResponse({ ok: false, error: "Unable to load analytics inputs." }, { status: 500 });
  }

  const aggregated = aggregatePlaybackEvents({
    events: (events ?? []) as Array<{
      session_id: string;
      tenant_id: string;
      channel_id: string;
      ts: string;
      event_type: string;
    }>,
    presence: (presence ?? []) as Array<{
      session_id: string;
      tenant_id: string;
      channel_id: string;
      last_seen_at: string;
      is_playing: boolean;
    }>,
    now,
  });

  if (aggregated.length > 0) {
    const { error: upsertError } = await admin.from("channel_stats_minute").upsert(aggregated, {
      onConflict: "tenant_id,channel_id,bucket_minute",
    });

    if (upsertError) {
      console.error("aggregate_realtime_stats upsert failed", upsertError);
      return jsonResponse({ ok: false, error: "Unable to upsert minute aggregates." }, { status: 500 });
    }
  }

  return jsonResponse({
    ok: true,
    lookback_minutes: lookbackMinutes,
    buckets_upserted: aggregated.length,
  });
});

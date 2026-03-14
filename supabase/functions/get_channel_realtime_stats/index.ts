import { z } from "npm:zod@4";

import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";
import { requireTenantEditor } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const requestSchema = z.object({
  channel_id: z.string().uuid(),
  range_minutes: z.number().int().min(5).max(60).optional(),
});

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
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
        error: "Invalid request body.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: channel, error: channelError } = await admin
    .from("channels")
    .select("id, tenant_id, name")
    .eq("id", body.channel_id)
    .maybeSingle();

  if (channelError) {
    console.error("get_channel_realtime_stats channel lookup failed", channelError);
    return jsonResponse({ ok: false, error: "Channel lookup failed." }, { status: 500 });
  }
  if (!channel) {
    return jsonResponse({ ok: false, error: "Channel not found." }, { status: 404 });
  }

  const editor = await requireTenantEditor(request, channel.tenant_id);
  if (!editor.ok) return editor.res;

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const rangeMinutes = body.range_minutes ?? 5;
  const rangeStart = new Date(now.getTime() - rangeMinutes * 60_000).toISOString();
  const presenceCutoff = new Date(now.getTime() - env.presenceWindowSeconds * 1000).toISOString();

  const [
    { data: presence, error: presenceError },
    { data: sessionsToday, error: sessionsError },
    { data: statsToday, error: statsTodayError },
    { data: lastMinutes, error: lastMinutesError },
  ] = await Promise.all([
    admin
      .from("channel_realtime_presence")
      .select("session_id")
      .eq("channel_id", body.channel_id)
      .eq("is_playing", true)
      .gte("last_seen_at", presenceCutoff),
    admin
      .from("playback_sessions")
      .select("id")
      .eq("channel_id", body.channel_id)
      .gte("started_at", todayStart),
    admin
      .from("channel_stats_minute")
      .select("watch_seconds, buffer_seconds, error_count")
      .eq("channel_id", body.channel_id)
      .gte("bucket_minute", todayStart),
    admin
      .from("channel_stats_minute")
      .select("bucket_minute, active_viewers, sessions_started, watch_seconds, buffer_seconds, error_count, plays")
      .eq("channel_id", body.channel_id)
      .gte("bucket_minute", rangeStart)
      .order("bucket_minute", { ascending: true }),
  ]);

  if (presenceError || sessionsError || statsTodayError || lastMinutesError) {
    console.error("get_channel_realtime_stats query failed", {
      presenceError,
      sessionsError,
      statsTodayError,
      lastMinutesError,
    });
    return jsonResponse({ ok: false, error: "Unable to load channel stats." }, { status: 500 });
  }

  const totals = (statsToday ?? []).reduce(
    (acc, row) => {
      acc.watch_seconds += Number(row.watch_seconds ?? 0);
      acc.buffer_seconds += Number(row.buffer_seconds ?? 0);
      acc.error_count += Number(row.error_count ?? 0);
      return acc;
    },
    { watch_seconds: 0, buffer_seconds: 0, error_count: 0 }
  );

  return jsonResponse({
    ok: true,
    channel_id: channel.id,
    channel_name: channel.name,
    active_viewers: presence?.length ?? 0,
    sessions_today: sessionsToday?.length ?? 0,
    watch_minutes_today: Math.round((totals.watch_seconds / 60) * 100) / 100,
    buffer_ratio:
      totals.watch_seconds + totals.buffer_seconds > 0
        ? Number((totals.buffer_seconds / (totals.watch_seconds + totals.buffer_seconds)).toFixed(4))
        : 0,
    errors_today: totals.error_count,
    last_5_minutes: lastMinutes ?? [],
  });
});

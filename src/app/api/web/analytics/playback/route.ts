import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "../../../_utils/supabase";
import { parseJson } from "../../../_utils/validate";

const REQUEST_SCHEMA = z.object({
  session_id: z.string().min(1),
  playable_type: z.enum(["movie", "episode", "replay"]),
  playable_id: z.string().uuid(),
  event_type: z.string().min(1),
  position_sec: z.number().int().min(0).max(172800).nullable().optional(),
  duration_sec: z.number().int().min(1).max(172800).nullable().optional(),
  device_type: z.string().max(64).nullable().optional(),
  os: z.string().max(64).nullable().optional(),
  country: z.string().max(8).nullable().optional(),
});

function normalizeEventType(input: string) {
  const normalized = input.trim().toUpperCase();
  if (normalized === "START" || normalized === "PLAY" || normalized === "START_PLAYBACK") {
    return "START_PLAYBACK";
  }
  if (normalized === "HEARTBEAT" || normalized === "PROGRESS") {
    return "HEARTBEAT";
  }
  if (
    normalized === "STOP" ||
    normalized === "END" ||
    normalized === "STOP_PLAYBACK" ||
    normalized === "END_PLAYBACK"
  ) {
    return "STOP_PLAYBACK";
  }
  return normalized;
}

async function resolvePlaybackContext(
  admin: ReturnType<typeof supabaseAdmin>,
  playableType: "movie" | "episode" | "replay",
  playableId: string
) {
  if (playableType === "movie") {
    const { data, error } = await admin
      .from("catalog_titles")
      .select("id,tenant_id")
      .eq("id", playableId)
      .maybeSingle();

    if (error) return { ok: false as const, error };
    if (!data?.tenant_id) return { ok: false as const, error: null };
    return {
      ok: true as const,
      tenantId: String(data.tenant_id),
      titleId: String(data.id),
      channelId: null,
    };
  }

  if (playableType === "episode") {
    const { data, error } = await admin
      .from("catalog_episodes")
      .select("id,tenant_id,series_id")
      .eq("id", playableId)
      .maybeSingle();

    if (error) return { ok: false as const, error };
    if (!data?.tenant_id) return { ok: false as const, error: null };
    return {
      ok: true as const,
      tenantId: String(data.tenant_id),
      titleId: data.series_id ? String(data.series_id) : null,
      channelId: null,
    };
  }

  const { data, error } = await admin
    .from("replays")
    .select("id,tenant_id,channel_id")
    .eq("id", playableId)
    .maybeSingle();

  if (error) return { ok: false as const, error };
  if (!data?.tenant_id) return { ok: false as const, error: null };
  return {
    ok: true as const,
    tenantId: String(data.tenant_id),
    titleId: null,
    channelId: data.channel_id ? String(data.channel_id) : null,
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const parsed = await parseJson(req, REQUEST_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const admin = supabaseAdmin();
  const body = parsed.data;
  const resolved = await resolvePlaybackContext(admin, body.playable_type, body.playable_id);

  if (!resolved.ok) {
    const errorMessage = resolved.error?.message ?? "";
    if (errorMessage.includes("catalog_playback_events")) {
      return NextResponse.json({ ok: true, skipped: true, reason: "analytics_unavailable" }, { status: 202 });
    }

    if (resolved.error) {
      console.error("Web catalog playback context error", {
        error: resolved.error.message,
        playableType: body.playable_type,
        playableId: body.playable_id,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    return NextResponse.json({ ok: false, error: "Contenu introuvable." }, { status: 404 });
  }

  const insertPayload = {
    tenant_id: resolved.tenantId,
    session_id: body.session_id.trim(),
    user_id: null,
    playable_type: body.playable_type,
    playable_id: body.playable_id,
    title_id: resolved.titleId,
    channel_id: resolved.channelId,
    event_type: normalizeEventType(body.event_type),
    device_type: body.device_type?.trim() || "desktop-web",
    platform: "web",
    os: body.os?.trim() || "Web",
    country: body.country?.trim() || null,
    position_sec: body.position_sec ?? null,
    duration_sec: body.duration_sec ?? null,
  };

  const { error } = await admin.from("catalog_playback_events").insert(insertPayload);
  if (error) {
    if (error.message.includes("catalog_playback_events")) {
      return NextResponse.json({ ok: true, skipped: true, reason: "analytics_unavailable" }, { status: 202 });
    }

    console.error("Web catalog playback analytics insert error", {
      error: error.message,
      playableType: body.playable_type,
      playableId: body.playable_id,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

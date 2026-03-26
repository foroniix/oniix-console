import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "../../../_utils/supabase";

const PARAMS_SCHEMA = z.object({
  replayId: z.string().uuid(),
});

type ChannelRelationRow = {
  id: string | null;
  name: string | null;
  logo: string | null;
};

type ReplayQueryRow = {
  id: string;
  tenant_id: string;
  title: string | null;
  synopsis: string | null;
  poster: string | null;
  hls_url: string | null;
  duration_sec: number | null;
  available_from: string | null;
  available_to: string | null;
  replay_status: string | null;
  channel_id: string | null;
  channel: ChannelRelationRow | ChannelRelationRow[] | null;
};

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function isReplayAvailable(row: ReplayQueryRow, nowMs: number) {
  if (String(row.replay_status ?? "").toLowerCase() !== "published") return false;
  if (!row.hls_url?.trim()) return false;

  const fromMs = row.available_from ? Date.parse(row.available_from) : null;
  const toMs = row.available_to ? Date.parse(row.available_to) : null;
  if (fromMs !== null && Number.isFinite(fromMs) && fromMs > nowMs) return false;
  if (toMs !== null && Number.isFinite(toMs) && toMs <= nowMs) return false;
  return true;
}

function mapReplay(row: ReplayQueryRow) {
  const channel = getSingleRelation(row.channel);
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    title: row.title?.trim() || "Replay",
    synopsis: row.synopsis ?? null,
    poster: row.poster ?? null,
    hls_url: row.hls_url ?? null,
    duration_sec: row.duration_sec ?? null,
    available_from: row.available_from ?? null,
    available_to: row.available_to ?? null,
    channel: {
      id: channel?.id ?? null,
      name: channel?.name ?? null,
      logo: channel?.logo ?? null,
    },
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: Promise<{ replayId: string }> }) {
  const parsedParams = PARAMS_SCHEMA.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ ok: false, error: "Replay invalide." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const nowMs = Date.now();

  const { data, error } = await admin
    .from("replays")
    .select(
      "id,tenant_id,title,synopsis,poster,hls_url,duration_sec,available_from,available_to,replay_status,channel_id,channel:channels(id,name,logo)"
    )
    .eq("id", parsedParams.data.replayId)
    .maybeSingle();

  if (error) {
    console.error("Web replay detail load error", {
      error: error.message,
      replayId: parsedParams.data.replayId,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const replayRow = data as ReplayQueryRow | null;
  if (!replayRow || !isReplayAvailable(replayRow, nowMs)) {
    return NextResponse.json({ ok: false, error: "Replay introuvable." }, { status: 404 });
  }

  let relatedRows: ReplayQueryRow[] = [];
  if (replayRow.channel_id) {
    const { data: relatedData, error: relatedError } = await admin
      .from("replays")
      .select(
        "id,tenant_id,title,synopsis,poster,hls_url,duration_sec,available_from,available_to,replay_status,channel_id,channel:channels(id,name,logo)"
      )
      .eq("channel_id", replayRow.channel_id)
      .eq("replay_status", "published")
      .neq("id", replayRow.id)
      .order("available_from", { ascending: false })
      .limit(8);

    if (relatedError) {
      console.error("Web replay related load error", {
        error: relatedError.message,
        replayId: replayRow.id,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    relatedRows = ((relatedData ?? []) as ReplayQueryRow[]).filter((row) => isReplayAvailable(row, nowMs));
  }

  return NextResponse.json(
    {
      ok: true,
      replay: mapReplay(replayRow),
      related_replays: relatedRows.slice(0, 6).map(mapReplay),
    },
    { status: 200 }
  );
}

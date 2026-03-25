import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { buildChannelNowNext, buildProgrammingGrid, type ProgrammingGridEntry } from "@/features/programming/grid";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseQuery } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const QUERY_SCHEMA = z.object({
  hours: z.coerce.number().int().min(1).max(72).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  includeReplays: z.string().optional(),
});

type ChannelRow = {
  id: string;
  tenant_id: string;
  name: string;
  logo: string | null;
  category: string | null;
  slug: string | null;
  active: boolean;
};

type StreamRow = {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  title: string | null;
  poster: string | null;
  status: "OFFLINE" | "LIVE" | "ENDED";
  updated_at: string | null;
};

type ProgramRelationRow = {
  id: string;
  title: string | null;
  poster: string | null;
  status: "draft" | "scheduled" | "published" | "cancelled";
};

type SlotQueryRow = {
  id: string;
  program_id: string;
  channel_id: string | null;
  starts_at: string;
  ends_at: string | null;
  slot_status: "scheduled" | "published" | "cancelled";
  visibility: "public" | "private";
  notes: string | null;
  program: ProgramRelationRow | ProgramRelationRow[] | null;
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
  channel_id: string | null;
};

function clean(value?: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function parseBool(value?: string) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function mapGridEntry(entry: ProgrammingGridEntry) {
  return {
    id: entry.id,
    program_id: entry.programId,
    title: entry.title,
    poster: entry.poster,
    starts_at: entry.startsAt,
    ends_at: entry.endsAt,
    slot_status: entry.slotStatus,
    visibility: entry.visibility,
    notes: entry.notes,
  };
}

export async function GET(req: NextRequest) {
  const parsed = parseQuery(req, QUERY_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const admin = supabaseAdmin();
  const hours = parsed.data.hours ?? 24;
  const limit = parsed.data.limit ?? 300;
  const includeReplays = parseBool(parsed.data.includeReplays);
  const nowIso = new Date().toISOString();
  const toIso = new Date(Date.now() + hours * 3_600_000).toISOString();

  const { data: streamRows, error: streamError } = await admin
    .from("streams")
    .select("id,tenant_id,channel_id,title,poster,status,updated_at")
    .eq("status", "LIVE")
    .order("updated_at", { ascending: false })
    .limit(1000);

  if (streamError) {
    console.error("Web live streams load error", { error: streamError.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const liveStreams = ((streamRows ?? []) as StreamRow[]).filter((row) => clean(row.channel_id));
  const channelIds = Array.from(
    new Set(liveStreams.map((row) => clean(row.channel_id)).filter((value): value is string => Boolean(value)))
  );

  if (channelIds.length === 0) {
    return NextResponse.json({
      ok: true,
      window: {
        from: nowIso,
        to: toIso,
        generated_at: nowIso,
      },
      grid: [],
      replays: includeReplays ? [] : undefined,
    });
  }

  const { data: channelRows, error: channelError } = await admin
    .from("channels")
    .select("id,tenant_id,name,logo,category,slug,active")
    .in("id", channelIds)
    .eq("active", true)
    .order("name", { ascending: true });

  if (channelError) {
    console.error("Web live channels load error", { error: channelError.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const channels = (channelRows ?? []) as ChannelRow[];
  const allowedChannelIds = new Set(channels.map((channel) => channel.id));
  const liveStreamsByChannel = new Map<string, StreamRow>();

  for (const row of liveStreams) {
    const channelId = clean(row.channel_id);
    if (!channelId || !allowedChannelIds.has(channelId) || liveStreamsByChannel.has(channelId)) continue;
    liveStreamsByChannel.set(channelId, row);
  }

  const visibleChannels = channels.filter((channel) => liveStreamsByChannel.has(channel.id));
  const visibleChannelIds = visibleChannels.map((channel) => channel.id);

  const { data: slotRows, error: slotsError } = await admin
    .from("program_slots")
    .select("id,program_id,channel_id,starts_at,ends_at,slot_status,visibility,notes,program:programs(id,title,poster,status)")
    .in("channel_id", visibleChannelIds)
    .eq("slot_status", "published")
    .eq("visibility", "public")
    .lt("starts_at", toIso)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (slotsError) {
    console.error("Web live slots load error", { error: slotsError.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const slots = ((slotRows ?? []) as SlotQueryRow[]).map((slot) => {
    const program = getSingleRelation(slot.program);
    return {
      id: slot.id,
      programId: slot.program_id,
      channelId: slot.channel_id ?? null,
      startsAt: slot.starts_at,
      endsAt: slot.ends_at ?? null,
      slotStatus: slot.slot_status,
      visibility: slot.visibility,
      notes: slot.notes ?? null,
      program: program
        ? {
            id: program.id,
            title: program.title ?? "Programme",
            poster: program.poster ?? null,
            status: program.status ?? "published",
          }
        : undefined,
      channel: undefined,
    };
  });

  const channelsForGrid = visibleChannels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    logo: channel.logo,
  }));

  const lanes = buildProgrammingGrid({
    slots,
    channels: channelsForGrid,
    windowStart: nowIso,
    windowEnd: toIso,
    statusFilter: ["published"],
    visibilityFilter: "public",
  });

  const nowNextRows = buildChannelNowNext({
    slots,
    channels: channelsForGrid,
    at: nowIso,
    statusFilter: ["published"],
    visibilityFilter: "public",
  });

  const nowNextMap = new Map(nowNextRows.map((row) => [row.channelId ?? "__no_channel__", row]));
  const channelMap = new Map(visibleChannels.map((channel) => [channel.id, channel]));

  let replays: Array<{
    id: string;
    tenant_id: string;
    title: string;
    synopsis: string | null;
    poster: string | null;
    hls_url: string | null;
    duration_sec: number | null;
    available_from: string | null;
    available_to: string | null;
    channel: { id: string | null; name: string | null; logo: string | null };
  }> = [];

  if (includeReplays) {
    const { data: replayRows, error: replayError } = await admin
      .from("replays")
      .select("id,tenant_id,title,synopsis,poster,hls_url,duration_sec,available_from,available_to,channel_id")
      .in("channel_id", visibleChannelIds)
      .eq("replay_status", "published")
      .order("available_from", { ascending: false })
      .limit(Math.min(limit, 200));

    if (replayError) {
      console.error("Web live replay load error", { error: replayError.message });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    const nowMs = Date.now();
    replays = ((replayRows ?? []) as ReplayQueryRow[])
      .filter((replay) => {
        const fromMs = replay.available_from ? Date.parse(replay.available_from) : null;
        const toMs = replay.available_to ? Date.parse(replay.available_to) : null;
        if (fromMs !== null && Number.isFinite(fromMs) && fromMs > nowMs) return false;
        if (toMs !== null && Number.isFinite(toMs) && toMs <= nowMs) return false;
        return true;
      })
      .map((replay) => {
        const channel = replay.channel_id ? channelMap.get(replay.channel_id) : null;
        return {
          id: replay.id,
          tenant_id: replay.tenant_id,
          title: replay.title ?? "Replay",
          synopsis: replay.synopsis ?? null,
          poster: replay.poster ?? null,
          hls_url: replay.hls_url ?? null,
          duration_sec: replay.duration_sec ?? null,
          available_from: replay.available_from ?? null,
          available_to: replay.available_to ?? null,
          channel: {
            id: channel?.id ?? null,
            name: channel?.name ?? null,
            logo: channel?.logo ?? null,
          },
        };
      });
  }

  return NextResponse.json({
    ok: true,
    window: {
      from: nowIso,
      to: toIso,
      generated_at: nowIso,
    },
    grid: lanes.map((lane) => {
      const channel = lane.channelId ? channelMap.get(lane.channelId) : null;
      const liveStream = lane.channelId ? liveStreamsByChannel.get(lane.channelId) ?? null : null;
      const nowNext = nowNextMap.get(lane.channelId ?? "__no_channel__");
      return {
        channel: {
          id: lane.channelId,
          tenant_id: channel?.tenant_id ?? null,
          name: lane.channelName,
          logo: lane.channelLogo,
          category: channel?.category ?? null,
          slug: channel?.slug ?? null,
        },
        live_stream: liveStream
          ? {
              id: liveStream.id,
              tenant_id: liveStream.tenant_id,
              channel_id: lane.channelId,
              title: liveStream.title?.trim() || channel?.name || "Live",
              poster: liveStream.poster ?? null,
              status: liveStream.status,
              updated_at: liveStream.updated_at ?? null,
            }
          : null,
        now: nowNext?.now ? mapGridEntry(nowNext.now) : null,
        next: nowNext?.next ? mapGridEntry(nowNext.next) : null,
        slots: lane.entries.map(mapGridEntry),
      };
    }),
    replays: includeReplays ? replays : undefined,
  });
}

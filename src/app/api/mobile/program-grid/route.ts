import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { buildChannelNowNext, buildProgrammingGrid, type ProgrammingGridEntry } from "@/features/programming/grid";
import { supabaseAdmin } from "../../_utils/supabase";
import { requireTenantIngestAuth } from "../../_utils/tenant-ingest-auth";
import { parseQuery } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const QUERY_SCHEMA = z.object({
  channelId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  hours: z.coerce.number().int().min(1).max(168).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  includeReplays: z.string().optional(),
});

type ChannelRow = {
  id: string;
  name: string;
  logo: string | null;
  category: string | null;
  slug: string | null;
  active: boolean;
};

type ProgramRelationRow = {
  id: string;
  title: string | null;
  poster: string | null;
  status: "draft" | "scheduled" | "published" | "cancelled";
};

type SlotChannelRelationRow = {
  id: string;
  name: string | null;
  logo: string | null;
  category: string | null;
  slug: string | null;
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
  channel: SlotChannelRelationRow | SlotChannelRelationRow[] | null;
};

type ReplayChannelRelationRow = {
  id: string | null;
  name: string | null;
  logo: string | null;
};

type ReplayQueryRow = {
  id: string;
  title: string | null;
  synopsis: string | null;
  poster: string | null;
  hls_url: string | null;
  duration_sec: number | null;
  available_from: string | null;
  available_to: string | null;
  channel: ReplayChannelRelationRow | ReplayChannelRelationRow[] | null;
};

type StreamQueryRow = {
  id: string;
  channel_id: string | null;
  title: string | null;
  hls_url: string | null;
  poster: string | null;
  status: "OFFLINE" | "LIVE" | "ENDED";
  updated_at: string | null;
};

function toIsoDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseBool(value?: string) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function invalidResponse() {
  return NextResponse.json({ ok: false, error: "Donnees invalides." }, { status: 400 });
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
  const tenantAuth = await requireTenantIngestAuth(req);
  if (!tenantAuth.ok) return tenantAuth.res;

  const query = parseQuery(req, QUERY_SCHEMA);
  if (!query.ok) return query.res;

  const nowIso = new Date().toISOString();
  const fromIso = query.data.from ? toIsoDate(query.data.from) : nowIso;
  if (!fromIso) return invalidResponse();

  const explicitToIso = query.data.to ? toIsoDate(query.data.to) : null;
  if (query.data.to && !explicitToIso) return invalidResponse();

  const hours = query.data.hours ?? 24;
  const computedToIso = new Date(new Date(fromIso).getTime() + hours * 3_600_000).toISOString();
  const toIso = explicitToIso ?? computedToIso;

  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return invalidResponse();
  if (toMs - fromMs > 14 * 24 * 3_600_000) return invalidResponse();

  const limit = query.data.limit ?? 300;
  const includeReplays = parseBool(query.data.includeReplays);
  const channelId = query.data.channelId ?? null;

  const admin = supabaseAdmin();

  let channelsQuery = admin
    .from("channels")
    .select("id,name,logo,category,slug,active")
    .eq("tenant_id", tenantAuth.tenantId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (channelId) channelsQuery = channelsQuery.eq("id", channelId);

  const { data: channelsData, error: channelsError } = await channelsQuery;
  if (channelsError) {
    console.error("Mobile program grid channels load error", {
      error: channelsError.message,
      tenantId: tenantAuth.tenantId,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const channels = (channelsData ?? []) as ChannelRow[];

  let streamsQuery = admin
    .from("streams")
    .select("id,channel_id,title,hls_url,poster,status,updated_at")
    .eq("tenant_id", tenantAuth.tenantId)
    .eq("status", "LIVE")
    .order("updated_at", { ascending: false })
    .limit(1000);

  if (channelId) streamsQuery = streamsQuery.eq("channel_id", channelId);

  const { data: streamRows, error: streamsError } = await streamsQuery;
  if (streamsError) {
    console.error("Mobile program grid streams load error", {
      error: streamsError.message,
      tenantId: tenantAuth.tenantId,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const liveStreamByChannel = new Map<
    string,
    {
      id: string;
      title: string;
      hls_url: string | null;
      poster: string | null;
      status: "OFFLINE" | "LIVE" | "ENDED";
      updated_at: string | null;
    }
  >();

  for (const row of (streamRows ?? []) as StreamQueryRow[]) {
    const streamChannelId = row.channel_id?.trim();
    if (!streamChannelId || liveStreamByChannel.has(streamChannelId)) continue;
    liveStreamByChannel.set(streamChannelId, {
      id: row.id,
      title: row.title?.trim() || "Live",
      hls_url: row.hls_url ?? null,
      poster: row.poster ?? null,
      status: row.status,
      updated_at: row.updated_at ?? null,
    });
  }

  let slotsQuery = admin
    .from("program_slots")
    .select(
      "id, program_id, channel_id, starts_at, ends_at, slot_status, visibility, notes, program:programs(id,title,poster,status,synopsis,category,tags), channel:channels(id,name,logo,category,slug)"
    )
    .eq("tenant_id", tenantAuth.tenantId)
    .eq("slot_status", "published")
    .eq("visibility", "public")
    .lt("starts_at", toIso)
    .or(`ends_at.is.null,ends_at.gt.${fromIso}`)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (channelId) slotsQuery = slotsQuery.eq("channel_id", channelId);

  const { data: slotRows, error: slotsError } = await slotsQuery;
  if (slotsError) {
    console.error("Mobile program grid slots load error", {
      error: slotsError.message,
      tenantId: tenantAuth.tenantId,
      fromIso,
      toIso,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const slots = ((slotRows ?? []) as SlotQueryRow[])
    .map((slot) => {
      const program = getSingleRelation(slot.program);
      const channel = getSingleRelation(slot.channel);
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
        channel: channel
          ? {
              id: channel.id,
              name: channel.name ?? "Chaine",
              logo: channel.logo ?? null,
              category: channel.category ?? "Autre",
            }
          : undefined,
      };
    })
    .filter((slot) => slot.program?.status === "published");

  const channelsForGrid = channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    logo: channel.logo,
  }));

  const lanes = buildProgrammingGrid({
    slots,
    channels: channelsForGrid,
    windowStart: fromIso,
    windowEnd: toIso,
    statusFilter: ["published"],
    visibilityFilter: "public",
    channelId,
  });

  const nowNextRows = buildChannelNowNext({
    slots,
    channels: channelsForGrid,
    at: nowIso,
    statusFilter: ["published"],
    visibilityFilter: "public",
    channelId,
  });

  const nowNextMap = new Map(
    nowNextRows.map((row) => [row.channelId ?? "__no_channel__", row])
  );

  const grid = lanes.map((lane) => {
    const nowNext = nowNextMap.get(lane.channelId ?? "__no_channel__");
    const liveStream = lane.channelId ? liveStreamByChannel.get(lane.channelId) ?? null : null;
    return {
      channel: {
        id: lane.channelId,
        name: lane.channelName,
        logo: lane.channelLogo,
      },
      live_stream: liveStream,
      now: nowNext?.now ? mapGridEntry(nowNext.now) : null,
      next: nowNext?.next ? mapGridEntry(nowNext.next) : null,
      slots: lane.entries.map(mapGridEntry),
    };
  });

  let replays: Array<{
    id: string;
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
    let replaysQuery = admin
      .from("replays")
      .select(
        "id,title,synopsis,poster,hls_url,duration_sec,available_from,available_to,channel_id,channel:channels(id,name,logo)"
      )
      .eq("tenant_id", tenantAuth.tenantId)
      .eq("replay_status", "published")
      .order("available_from", { ascending: true })
      .limit(Math.min(limit, 300));

    if (channelId) replaysQuery = replaysQuery.eq("channel_id", channelId);

    const { data: replayRows, error: replayError } = await replaysQuery;
    if (replayError) {
      console.error("Mobile program grid replay load error", {
        error: replayError.message,
        tenantId: tenantAuth.tenantId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    replays = ((replayRows ?? []) as ReplayQueryRow[])
      .filter((replay) => {
        const availableFrom = replay.available_from ? Date.parse(replay.available_from) : null;
        const availableTo = replay.available_to ? Date.parse(replay.available_to) : null;
        if (availableFrom !== null && availableFrom >= toMs) return false;
        if (availableTo !== null && availableTo <= fromMs) return false;
        return true;
      })
      .map((replay) => {
        const channel = getSingleRelation(replay.channel);
        return {
          id: replay.id,
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

  return NextResponse.json(
    {
      ok: true,
      tenant_id: tenantAuth.tenantId,
      window: {
        from: fromIso,
        to: toIso,
        generated_at: nowIso,
      },
      grid,
      replays: includeReplays ? replays : undefined,
    },
    { status: 200 }
  );
}

// admin/src/lib/data.ts

// ==========================================
// TYPES
// ==========================================

export type Category =
  | "Sports"
  | "Music"
  | "Religion"
  | "Documentaire"
  | "Art"
  | "Mode"
  | "Faits Divers"
  | "Anime"
  | "Manga"
  | "Autre";

export type Channel = {
  id: string;
  name: string;
  category: Category;
  slug: string;
  active: boolean;
  logo?: string | null;
  originHlsUrl?: string | null;
};

export type ChannelHealth = {
  status: "ok" | "degraded" | "down" | null;
  message: string | null;
  lastCheckAt: string | null;
  masterPlaylistHttpCode: number | null;
  mediaPlaylistHttpCode: number | null;
  segmentHttpCode: number | null;
};

export type ChannelRealtimeStats = {
  activeViewers: number;
  sessionsToday: number;
  watchMinutesToday: number;
  bufferRatio: number;
  errorsToday: number;
  lastMinutes: Array<{
    bucketMinute: string;
    activeViewers: number;
    sessionsStarted: number;
    watchSeconds: number;
    bufferSeconds: number;
    errorCount: number;
    plays: number;
  }>;
  health: ChannelHealth;
};

export type StreamStatus = "OFFLINE" | "LIVE" | "ENDED";

export type Caption = {
  id?: string;
  lang: string;
  url: string;
  kind?: "subtitles" | "captions";
  label?: string;
};

export type Marker = { id?: string; at: number; label: string };

export type HealthSample = {
  id?: string;
  ts: string;
  reachable: boolean;
  bitrateKbps?: number;
  downloadMs?: number;
  err?: string;
};

export type Stream = {
  id: string;
  channelId: string;
  title: string;
  hlsUrl: string;
  status: StreamStatus;
  scheduledAt?: string | null;
  description?: string | null;
  poster?: string | null;
  latency?: "normal" | "low" | "ultra-low";
  dvrWindowSec?: number;
  record?: boolean;
  drm?: boolean;
  captions?: Caption[];
  markers?: Marker[];
  geo?: { allow: string[]; block: string[] };
  createdAt?: string;
  updatedAt?: string;
  channel?: { name: string; logo: string | null; category: string };
};

export type Role = "viewer" | "user" | "editor" | "admin";

export type User = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role: Role;
  suspended: boolean;
  createdAt: string;
};

export type Vod = {
  id: string;
  channelId: string | null;
  title: string;
  hlsUrl: string;
  durationSec?: number | null;
  thumb?: string | null;
  tags?: string[];
  sourceStreamId?: string | null;
  createdAt: string;
  channel?: { name: string; logo: string | null; category: string };
};

export type ProgramStatus = "draft" | "scheduled" | "published" | "cancelled";
export type ProgramSlotStatus = "scheduled" | "published" | "cancelled";
export type ProgramSlotVisibility = "public" | "private";
export type ReplayStatus = "draft" | "processing" | "ready" | "published" | "archived";

export type Program = {
  id: string;
  channelId?: string | null;
  title: string;
  synopsis?: string | null;
  category?: string | null;
  poster?: string | null;
  tags?: string[];
  status: ProgramStatus;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  channel?: { id: string; name: string; logo: string | null; category: string };
};

export type ProgramSlot = {
  id: string;
  programId: string;
  channelId?: string | null;
  startsAt: string;
  endsAt?: string | null;
  slotStatus: ProgramSlotStatus;
  visibility: ProgramSlotVisibility;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  program?: { id: string; title: string; poster?: string | null; status: ProgramStatus };
  channel?: { id: string; name: string; logo: string | null; category: string };
};

export type Replay = {
  id: string;
  streamId?: string | null;
  channelId?: string | null;
  title: string;
  synopsis?: string | null;
  hlsUrl?: string | null;
  poster?: string | null;
  durationSec?: number | null;
  replayStatus: ReplayStatus;
  availableFrom?: string | null;
  availableTo?: string | null;
  sourceHlsUrl?: string | null;
  clipStartAt?: string | null;
  clipEndAt?: string | null;
  processingError?: string | null;
  geo?: { allow: string[]; block: string[] };
  createdAt?: string;
  updatedAt?: string;
  stream?: { id: string; title: string; status: string };
  channel?: { id: string; name: string; logo: string | null; category: string };
};

export type Activity = {
  id: string;
  title: string;
  description?: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  actorAvatarUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type AnalyticsStats = {
  live: { activeUsers: number; currentStreams: Record<string, number> };
  traffic: { time: string; viewers: number }[];
  devices: { name: string; value: number; color?: string }[];
  kpi: { totalUsers: number; totalEvents: number; watchTime: number };
};

// ==========================================
// HELPERS
// ==========================================

type ApiRow = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return fallback;
  return Boolean(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asApiRows(value: unknown): ApiRow[] {
  return Array.isArray(value)
    ? value.filter((item): item is ApiRow => typeof item === "object" && item !== null)
    : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function guardId(id: unknown, ctx: string): string {
  const v = String(id ?? "").trim();
  if (!v || v === "undefined" || v === "null") {
    throw new Error(`${ctx}: id invalide`);
  }
  return v;
}

async function j(r: Response): Promise<unknown> {
  const ct = r.headers.get("content-type") || "";
  if (r.ok) {
    if (r.status === 204) return {};
    if (ct.includes("application/json")) return r.json();
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: true, text };
    }
  } else {
    try {
      const err = ct.includes("application/json") ? await r.json() : { message: await r.text() };
      throw new Error(err.error || err.message || `Request failed (${r.status})`);
    } catch {
      throw new Error(`Request failed (${r.status})`);
    }
  }
}

// ==========================================
// MAPPERS
// ==========================================

const mapStream = (row: ApiRow): Stream => ({
  id: asString(row.id),
  channelId: asString(row.channel_id ?? row.channelId),
  title: asString(row.title),
  hlsUrl: asString(row.hls_url ?? row.hlsUrl),
  status: asString(row.status) as StreamStatus,
  scheduledAt: asNullableString(row.scheduled_at ?? row.scheduledAt),
  description: asNullableString(row.description),
  poster: asNullableString(row.poster),
  latency: (asNullableString(row.latency) as Stream["latency"]) ?? "normal",
  dvrWindowSec: asNumber(row.dvr_window_sec ?? row.dvrWindowSec, 10800),
  record: asBoolean(row.record, true),
  drm: asBoolean(row.drm, false),
  captions: asApiRows(row.captions).map((c) => ({
    id: String(c.id ?? c.lang ?? ""),
    lang: String(c.lang ?? ""),
    url: String(c.url ?? ""),
    kind: c.kind as Caption["kind"] | undefined,
    label: (c.label as string | undefined) ?? undefined,
  })),
  markers: asApiRows(row.markers).map((m, i: number) => ({
    id: String(m.id ?? i),
    at: Number(m.at),
    label: String(m.label ?? ""),
  })),
  geo: (row.geo as Stream["geo"] | undefined) ?? { allow: [], block: [] },
  createdAt: asNullableString(row.created_at ?? row.createdAt) ?? undefined,
  updatedAt: asNullableString(row.updated_at ?? row.updatedAt) ?? undefined,
  channel: (row.channel as Stream["channel"] | undefined) ?? undefined,
});

const mapChannel = (row: ApiRow): Channel => ({
  id: asString(row.id),
  name: asString(row.name),
  category: (asNullableString(row.category) as Category) ?? "Autre",
  slug: asString(row.slug),
  active: asBoolean(row.is_active ?? row.active),
  logo: asNullableString(row.logo),
  originHlsUrl: asNullableString(row.origin_hls_url ?? row.originHlsUrl),
});

const toBodyStream = (s: Partial<Stream>) => ({
  channelId: s.channelId,
  title: s.title,
  hlsUrl: s.hlsUrl,
  status: s.status,
  scheduledAt: s.scheduledAt ?? null,
  description: s.description ?? null,
  poster: s.poster ?? null,
  latency: s.latency ?? "normal",
  dvrWindowSec: s.dvrWindowSec ?? 10800,
  record: s.record ?? true,
  drm: s.drm ?? false,
  captions: s.captions ?? [],
  markers: (s.markers ?? []).map((m) => ({ at: Number(m.at), label: m.label })),
  geo: s.geo ?? { allow: [], block: [] },
});

const mapVod = (v: ApiRow): Vod => ({
  id: asString(v.id),
  channelId: asNullableString(v.channel_id ?? v.channelId),
  title: asString(v.title),
  hlsUrl: asString(v.hls_url ?? v.hlsUrl),
  durationSec: v.duration_sec === undefined && v.durationSec === undefined ? null : asNumber(v.duration_sec ?? v.durationSec),
  thumb: asNullableString(v.thumb),
  tags: asStringArray(v.tags),
  sourceStreamId: asNullableString(v.source_stream_id ?? v.sourceStreamId),
  createdAt: asString(v.created_at ?? v.createdAt),
  channel: (v.channel as Vod["channel"] | undefined) ?? undefined,
});

const mapProgram = (p: ApiRow): Program => ({
  id: asString(p.id),
  channelId: asNullableString(p.channel_id ?? p.channelId),
  title: asString(p.title),
  synopsis: asNullableString(p.synopsis),
  category: asNullableString(p.category),
  poster: asNullableString(p.poster),
  tags: asStringArray(p.tags),
  status: (asNullableString(p.status) as ProgramStatus) ?? "draft",
  publishedAt: asNullableString(p.published_at ?? p.publishedAt),
  createdAt: asNullableString(p.created_at ?? p.createdAt) ?? undefined,
  updatedAt: asNullableString(p.updated_at ?? p.updatedAt) ?? undefined,
  channel: (p.channel as Program["channel"] | undefined) ?? undefined,
});

const mapProgramSlot = (s: ApiRow): ProgramSlot => ({
  id: asString(s.id),
  programId: asString(s.program_id ?? s.programId),
  channelId: asNullableString(s.channel_id ?? s.channelId),
  startsAt: asString(s.starts_at ?? s.startsAt),
  endsAt: asNullableString(s.ends_at ?? s.endsAt),
  slotStatus: (asNullableString(s.slot_status ?? s.slotStatus) as ProgramSlotStatus) ?? "scheduled",
  visibility: (asNullableString(s.visibility) as ProgramSlotVisibility) ?? "public",
  notes: asNullableString(s.notes),
  createdAt: asNullableString(s.created_at ?? s.createdAt) ?? undefined,
  updatedAt: asNullableString(s.updated_at ?? s.updatedAt) ?? undefined,
  program: (s.program as ProgramSlot["program"] | undefined) ?? undefined,
  channel: (s.channel as ProgramSlot["channel"] | undefined) ?? undefined,
});

const mapReplay = (r: ApiRow): Replay => ({
  id: asString(r.id),
  streamId: asNullableString(r.stream_id ?? r.streamId),
  channelId: asNullableString(r.channel_id ?? r.channelId),
  title: asString(r.title),
  synopsis: asNullableString(r.synopsis),
  hlsUrl: asNullableString(r.hls_url ?? r.hlsUrl),
  poster: asNullableString(r.poster),
  durationSec: r.duration_sec === undefined && r.durationSec === undefined ? null : asNumber(r.duration_sec ?? r.durationSec),
  replayStatus: (asNullableString(r.replay_status ?? r.replayStatus) as ReplayStatus) ?? "draft",
  availableFrom: asNullableString(r.available_from ?? r.availableFrom),
  availableTo: asNullableString(r.available_to ?? r.availableTo),
  sourceHlsUrl: asNullableString(r.source_hls_url ?? r.sourceHlsUrl),
  clipStartAt: asNullableString(r.clip_start_at ?? r.clipStartAt),
  clipEndAt: asNullableString(r.clip_end_at ?? r.clipEndAt),
  processingError: asNullableString(r.processing_error ?? r.processingError),
  geo: (r.geo as Replay["geo"] | undefined) ?? { allow: [], block: [] },
  createdAt: asNullableString(r.created_at ?? r.createdAt) ?? undefined,
  updatedAt: asNullableString(r.updated_at ?? r.updatedAt) ?? undefined,
  stream: (r.stream as Replay["stream"] | undefined) ?? undefined,
  channel: (r.channel as Replay["channel"] | undefined) ?? undefined,
});

const toBodyProgram = (p: Partial<Program>) => ({
  ...(p.channelId !== undefined ? { channelId: p.channelId } : {}),
  ...(p.title !== undefined ? { title: p.title } : {}),
  ...(p.synopsis !== undefined ? { synopsis: p.synopsis } : {}),
  ...(p.category !== undefined ? { category: p.category } : {}),
  ...(p.poster !== undefined ? { poster: p.poster } : {}),
  ...(p.tags !== undefined ? { tags: p.tags } : {}),
  ...(p.status !== undefined ? { status: p.status } : {}),
  ...(p.publishedAt !== undefined ? { publishedAt: p.publishedAt } : {}),
});

const toBodyProgramSlot = (s: Partial<ProgramSlot>) => ({
  ...(s.programId !== undefined ? { programId: s.programId } : {}),
  ...(s.channelId !== undefined ? { channelId: s.channelId } : {}),
  ...(s.startsAt !== undefined ? { startsAt: s.startsAt } : {}),
  ...(s.endsAt !== undefined ? { endsAt: s.endsAt } : {}),
  ...(s.slotStatus !== undefined ? { slotStatus: s.slotStatus } : {}),
  ...(s.visibility !== undefined ? { visibility: s.visibility } : {}),
  ...(s.notes !== undefined ? { notes: s.notes } : {}),
});

const toBodyReplay = (r: Partial<Replay>) => ({
  ...(r.streamId !== undefined ? { streamId: r.streamId } : {}),
  ...(r.channelId !== undefined ? { channelId: r.channelId } : {}),
  ...(r.title !== undefined ? { title: r.title } : {}),
  ...(r.synopsis !== undefined ? { synopsis: r.synopsis } : {}),
  ...(r.hlsUrl !== undefined ? { hlsUrl: r.hlsUrl } : {}),
  ...(r.poster !== undefined ? { poster: r.poster } : {}),
  ...(r.durationSec !== undefined ? { durationSec: r.durationSec } : {}),
  ...(r.replayStatus !== undefined ? { replayStatus: r.replayStatus } : {}),
  ...(r.availableFrom !== undefined ? { availableFrom: r.availableFrom } : {}),
  ...(r.availableTo !== undefined ? { availableTo: r.availableTo } : {}),
  ...(r.sourceHlsUrl !== undefined ? { sourceHlsUrl: r.sourceHlsUrl } : {}),
  ...(r.clipStartAt !== undefined ? { clipStartAt: r.clipStartAt } : {}),
  ...(r.clipEndAt !== undefined ? { clipEndAt: r.clipEndAt } : {}),
  ...(r.geo !== undefined ? { geo: r.geo } : {}),
});

// ==========================================
// API FUNCTIONS
// ==========================================

// --- Channels ---
export async function listChannels(): Promise<Channel[]> {
  const rows = await j(await fetch("/api/channels", { cache: "no-store" }));
  return (rows as ApiRow[]).map(mapChannel);
}

export async function upsertChannel(input: Partial<Channel> & { id?: string }): Promise<Channel> {
  const headers = { "content-type": "application/json" };
  const originHlsUrl =
    typeof input.originHlsUrl === "string" && input.originHlsUrl.trim() === ""
      ? null
      : input.originHlsUrl ?? null;
  const body = JSON.stringify({
    name: input.name,
    category: (input.category ?? "Autre") as Category,
    active: input.active ?? true,
    logo: input.logo ?? null,
    slug: input.slug,
    originHlsUrl,
  });

  const row = input.id
    ? await j(
        await fetch(`/api/channels/${encodeURIComponent(guardId(input.id, "upsertChannel"))}`, {
          method: "PATCH",
          headers,
          body,
        })
      )
    : await j(await fetch(`/api/channels`, { method: "POST", headers, body }));

  return mapChannel(row as ApiRow);
}

export async function toggleChannel(id: string, active: boolean): Promise<void> {
  const sid = guardId(id, "toggleChannel");
  await j(
    await fetch(`/api/channels/${encodeURIComponent(sid)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active }),
    })
  );
}

// --- Streams ---
export async function listStreams(filter?: { status?: StreamStatus; channelId?: string }): Promise<Stream[]> {
  const qs = new URLSearchParams();
  if (filter?.status) qs.set("status", filter.status);
  if (filter?.channelId) qs.set("channelId", filter.channelId);
  const rows = await j(await fetch(`/api/streams?${qs}`, { cache: "no-store" }));
  return (rows as ApiRow[]).map(mapStream);
}

export async function getStream(id: string): Promise<Stream> {
  const sid = guardId(id, "getStream");
  const row = await j(await fetch(`/api/streams/${encodeURIComponent(sid)}`, { cache: "no-store" }));
  return mapStream(row as ApiRow);
}

export async function upsertStream(s: Partial<Stream> & { id?: string }): Promise<Stream> {
  const headers = { "content-type": "application/json" };
  const body = JSON.stringify(toBodyStream(s));
  const row = s.id
    ? await j(
        await fetch(`/api/streams/${encodeURIComponent(guardId(s.id, "upsertStream"))}`, {
          method: "PATCH",
          headers,
          body,
        })
      )
    : await j(await fetch(`/api/streams`, { method: "POST", headers, body }));

  return mapStream(row as ApiRow);
}

export async function setStreamStatus(id: string, status: StreamStatus) {
  const sid = guardId(id, "setStreamStatus");
  const row = await j(
    await fetch(`/api/streams/${encodeURIComponent(sid)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    })
  );
  return mapStream(row as ApiRow);
}

export async function removeStream(id: string, opts?: { force?: boolean }) {
  const sid = guardId(id, "removeStream");
  const url = `/api/streams/${encodeURIComponent(sid)}${opts?.force ? "?force=1" : ""}`;
  return j(await fetch(url, { method: "DELETE" }));
}

// --- Captions ---
export async function addCaption(streamId: string, caption: Caption) {
  const sid = guardId(streamId, "addCaption");
  const s = await getStream(sid);
  const next = [...(s.captions || []), caption];
  return j(
    await fetch(`/api/streams/${encodeURIComponent(sid)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ captions: next }),
    })
  );
}

export async function removeCaption(streamId: string, lang: string) {
  const sid = guardId(streamId, "removeCaption");
  const s = await getStream(sid);
  const next = (s.captions || []).filter((x) => x.lang !== lang);
  return j(
    await fetch(`/api/streams/${encodeURIComponent(sid)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ captions: next }),
    })
  );
}

// --- Markers ---
export async function addMarker(streamId: string, marker: Marker) {
  const sid = guardId(streamId, "addMarker");
  const s = await getStream(sid);
  const next = [...(s.markers || []), marker];
  return j(
    await fetch(`/api/streams/${encodeURIComponent(sid)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markers: next }),
    })
  );
}

export async function removeMarker(streamId: string, at: number | string) {
  const sid = guardId(streamId, "removeMarker");
  const s = await getStream(sid);
  const next = (s.markers || []).filter((x) => x.at !== Number(at));
  return j(
    await fetch(`/api/streams/${encodeURIComponent(sid)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markers: next }),
    })
  );
}

export async function endLiveAndCreateReplay(
  id: string,
  opts?: {
    title?: string;
    synopsis?: string;
    hlsUrl?: string;
    durationSec?: number;
    poster?: string;
    thumb?: string;
    replayStatus?: ReplayStatus;
    availableFrom?: string;
    availableTo?: string;
    clipStartAt?: string;
    clipEndAt?: string;
    sourceHlsUrl?: string;
    endStream?: boolean;
    baseUrl?: string;
  }
) {
  const sid = guardId(id, "endLiveAndCreateReplay");
  return j(
    await fetch(`/api/streams/${encodeURIComponent(sid)}/replay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: opts?.title,
        synopsis: opts?.synopsis,
        hlsUrl: opts?.hlsUrl,
        durationSec: opts?.durationSec,
        poster: opts?.poster ?? opts?.thumb ?? null,
        replayStatus: opts?.replayStatus,
        availableFrom: opts?.availableFrom,
        availableTo: opts?.availableTo,
        clipStartAt: opts?.clipStartAt,
        clipEndAt: opts?.clipEndAt,
        sourceHlsUrl: opts?.sourceHlsUrl,
        endStream: opts?.endStream,
        baseUrl: opts?.baseUrl,
      }),
    })
  );
}

export async function getChannelRealtimeStats(
  channelId: string,
  options?: { minutes?: number }
): Promise<ChannelRealtimeStats> {
  const sid = guardId(channelId, "getChannelRealtimeStats");
  const qs = new URLSearchParams();
  if (options?.minutes) qs.set("minutes", String(options.minutes));
  return j(
    await fetch(`/api/channels/${encodeURIComponent(sid)}/realtime-stats?${qs.toString()}`, {
      cache: "no-store",
    })
  ) as Promise<ChannelRealtimeStats>;
}

// --- VOD ---
export async function listVod(): Promise<Vod[]> {
  const rows = await j(await fetch("/api/vod", { cache: "no-store" }));
  return (rows as ApiRow[]).map(mapVod);
}
export const listVods = listVod;

export async function upsertVod(v: Partial<Vod> & { id?: string }): Promise<Vod> {
  const headers = { "content-type": "application/json" };
  const body = JSON.stringify({
    channelId: v.channelId ?? null,
    title: v.title ?? "",
    hlsUrl: v.hlsUrl ?? "",
    durationSec: typeof v.durationSec === "number" ? v.durationSec : null,
    thumb: v.thumb ?? null,
    tags: v.tags ?? [],
    sourceStreamId: v.sourceStreamId ?? null,
  });

  const row = v.id
    ? await j(
        await fetch(`/api/vod/${encodeURIComponent(guardId(v.id, "upsertVod"))}`, {
          method: "PATCH",
          headers,
          body,
        })
      )
    : await j(await fetch(`/api/vod`, { method: "POST", headers, body }));

  return mapVod(row as ApiRow);
}

// --- Programs ---
export async function listPrograms(filter?: {
  status?: ProgramStatus;
  channelId?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<Program[]> {
  const qs = new URLSearchParams();
  if (filter?.status) qs.set("status", filter.status);
  if (filter?.channelId) qs.set("channelId", filter.channelId);
  if (filter?.search) qs.set("search", filter.search);
  if (filter?.from) qs.set("from", filter.from);
  if (filter?.to) qs.set("to", filter.to);
  if (typeof filter?.limit === "number") qs.set("limit", String(filter.limit));
  const rows = await j(await fetch(`/api/programs?${qs}`, { cache: "no-store" }));
  return (rows as ApiRow[]).map(mapProgram);
}

export async function upsertProgram(p: Partial<Program> & { id?: string }): Promise<Program> {
  const headers = { "content-type": "application/json" };
  const body = JSON.stringify(toBodyProgram(p));

  const row = p.id
    ? await j(
        await fetch(`/api/programs/${encodeURIComponent(guardId(p.id, "upsertProgram"))}`, {
          method: "PATCH",
          headers,
          body,
        })
      )
    : await j(await fetch(`/api/programs`, { method: "POST", headers, body }));

  return mapProgram(row as ApiRow);
}

export async function publishProgram(id: string): Promise<Program> {
  const sid = guardId(id, "publishProgram");
  const row = await j(
    await fetch(`/api/programs/${encodeURIComponent(sid)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    })
  );
  return mapProgram(row as ApiRow);
}

export async function removeProgram(id: string) {
  const sid = guardId(id, "removeProgram");
  return j(await fetch(`/api/programs/${encodeURIComponent(sid)}`, { method: "DELETE" }));
}

// --- Program Slots ---
export async function listProgramSlots(filter?: {
  programId?: string;
  channelId?: string;
  status?: ProgramSlotStatus;
  visibility?: ProgramSlotVisibility;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<ProgramSlot[]> {
  const qs = new URLSearchParams();
  if (filter?.programId) qs.set("programId", filter.programId);
  if (filter?.channelId) qs.set("channelId", filter.channelId);
  if (filter?.status) qs.set("status", filter.status);
  if (filter?.visibility) qs.set("visibility", filter.visibility);
  if (filter?.from) qs.set("from", filter.from);
  if (filter?.to) qs.set("to", filter.to);
  if (typeof filter?.limit === "number") qs.set("limit", String(filter.limit));
  const rows = await j(await fetch(`/api/program-slots?${qs}`, { cache: "no-store" }));
  return (rows as ApiRow[]).map(mapProgramSlot);
}

export async function upsertProgramSlot(s: Partial<ProgramSlot> & { id?: string }): Promise<ProgramSlot> {
  const headers = { "content-type": "application/json" };
  const body = JSON.stringify(toBodyProgramSlot(s));

  const row = s.id
    ? await j(
        await fetch(`/api/program-slots/${encodeURIComponent(guardId(s.id, "upsertProgramSlot"))}`, {
          method: "PATCH",
          headers,
          body,
        })
      )
    : await j(await fetch(`/api/program-slots`, { method: "POST", headers, body }));

  return mapProgramSlot(row as ApiRow);
}

export async function publishProgramSlot(id: string): Promise<ProgramSlot> {
  const sid = guardId(id, "publishProgramSlot");
  const row = await j(
    await fetch(`/api/program-slots/${encodeURIComponent(sid)}/publish`, {
      method: "POST",
    })
  );
  return mapProgramSlot(row as ApiRow);
}

export async function removeProgramSlot(id: string) {
  const sid = guardId(id, "removeProgramSlot");
  return j(await fetch(`/api/program-slots/${encodeURIComponent(sid)}`, { method: "DELETE" }));
}

// --- Replays ---
export async function listReplays(filter?: {
  status?: ReplayStatus;
  channelId?: string;
  streamId?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<Replay[]> {
  const qs = new URLSearchParams();
  if (filter?.status) qs.set("status", filter.status);
  if (filter?.channelId) qs.set("channelId", filter.channelId);
  if (filter?.streamId) qs.set("streamId", filter.streamId);
  if (filter?.search) qs.set("search", filter.search);
  if (filter?.from) qs.set("from", filter.from);
  if (filter?.to) qs.set("to", filter.to);
  if (typeof filter?.limit === "number") qs.set("limit", String(filter.limit));
  const rows = await j(await fetch(`/api/replays?${qs}`, { cache: "no-store" }));
  return (rows as ApiRow[]).map(mapReplay);
}

export async function upsertReplay(r: Partial<Replay> & { id?: string }): Promise<Replay> {
  const headers = { "content-type": "application/json" };
  const body = JSON.stringify(toBodyReplay(r));

  const row = r.id
    ? await j(
        await fetch(`/api/replays/${encodeURIComponent(guardId(r.id, "upsertReplay"))}`, {
          method: "PATCH",
          headers,
          body,
        })
      )
    : await j(await fetch(`/api/replays`, { method: "POST", headers, body }));

  return mapReplay(row as ApiRow);
}

export async function publishReplay(id: string): Promise<Replay> {
  const sid = guardId(id, "publishReplay");
  const row = await j(
    await fetch(`/api/replays/${encodeURIComponent(sid)}/publish`, {
      method: "POST",
    })
  );
  return mapReplay(row as ApiRow);
}

export async function removeReplay(id: string) {
  const sid = guardId(id, "removeReplay");
  return j(await fetch(`/api/replays/${encodeURIComponent(sid)}`, { method: "DELETE" }));
}

// --- Users ---
export async function listUsers(): Promise<User[]> {
  return (await j(await fetch("/api/users", { cache: "no-store" }))) as User[];
}

export async function upsertUser(u: Partial<User>) {
  const headers = { "content-type": "application/json" };
  return j(
    await fetch("/api/users", {
      method: "POST",
      headers,
      body: JSON.stringify(u),
    })
  );
}

export async function setUserRole(userId: string, role: Role) {
  return upsertUser({ id: userId, role });
}

export async function setUserSuspended(userId: string, suspended: boolean) {
  return upsertUser({ id: userId, suspended });
}

// --- Analytics ---
export async function getAnalytics(period: string = "24h"): Promise<AnalyticsStats> {
  const res = await fetch(`/api/analytics/stats?period=${encodeURIComponent(period)}`, { cache: "no-store" });
  if (!res.ok) {
    return {
      live: { activeUsers: 0, currentStreams: {} },
      traffic: [],
      devices: [],
      kpi: { totalUsers: 0, totalEvents: 0, watchTime: 0 },
    };
  }

  const json = await res.json().catch(() => null);

  return {
    live: {
      activeUsers: Number(json?.live?.activeUsers ?? 0),
      currentStreams: (json?.live?.currentStreams ?? {}) as Record<string, number>,
    },
    traffic: Array.isArray(json?.traffic) ? json.traffic : [],
    devices: Array.isArray(json?.devices) ? json.devices : [],
    kpi: {
      totalUsers: Number(json?.kpi?.totalUsers ?? 0),
      totalEvents: Number(json?.kpi?.totalEvents ?? 0),
      watchTime: Number(json?.kpi?.watchTime ?? 0),
    },
  };
}

// --- Activities ---
type AuditLogRow = {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_user_id: string | null;
  actor?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

function titleCaseWords(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function humanizeAction(action: string) {
  const normalized = action.trim().toLowerCase();
  const map: Record<string, string> = {
    "program.create": "Creation programme",
    "program.update": "Mise a jour programme",
    "program.publish": "Publication programme",
    "program.delete": "Suppression programme",
    "program_slot.create": "Planification diffusion",
    "program_slot.update": "Mise a jour diffusion",
    "program_slot.publish": "Publication diffusion",
    "program_slot.delete": "Suppression diffusion",
    "replay.create": "Creation replay",
    "replay.update": "Mise a jour replay",
    "replay.publish": "Publication replay",
    "replay.delete": "Suppression replay",
    "stream.create": "Creation direct",
    "stream.update": "Mise a jour direct",
    "stream.start": "Demarrage direct",
    "stream.end": "Fin direct",
    "stream.delete": "Suppression direct",
    "channel.create": "Creation chaine",
    "channel.update": "Mise a jour chaine",
    "channel.delete": "Suppression chaine",
    "tenant.create": "Creation espace",
    "invite.create": "Invitation membre",
    "member.update": "Mise a jour membre",
  };

  if (map[normalized]) return map[normalized];
  return titleCaseWords(normalized.replaceAll(".", " "));
}

function describeActivity(row: AuditLogRow) {
  const metadata = row.metadata ?? {};
  const metadataTitle =
    typeof metadata.title === "string" && metadata.title.trim().length > 0
      ? metadata.title.trim()
      : typeof metadata.name === "string" && metadata.name.trim().length > 0
        ? metadata.name.trim()
        : null;

  const targetLabel = row.target_type ? titleCaseWords(row.target_type) : "Console";
  const title = metadataTitle ? `${targetLabel} - ${metadataTitle}` : targetLabel;

  let description: string | null = humanizeAction(row.action);
  if (typeof metadata.previousStatus === "string" && typeof metadata.nextStatus === "string") {
    description = `${description} - ${metadata.previousStatus} -> ${metadata.nextStatus}`;
  } else if (typeof metadata.slotStatus === "string") {
    description = `${description} - ${metadata.slotStatus}`;
  }

  return { title, description };
}

export async function listActivities(filter?: {
  page?: number;
  pageSize?: number;
  q?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
}): Promise<Activity[]> {
  const qs = new URLSearchParams();
  if (typeof filter?.page === "number") qs.set("page", String(filter.page));
  if (typeof filter?.pageSize === "number") qs.set("pageSize", String(filter.pageSize));
  if (filter?.q) qs.set("q", filter.q);
  if (filter?.action) qs.set("action", filter.action);
  if (filter?.targetType) qs.set("targetType", filter.targetType);
  if (filter?.from) qs.set("from", filter.from);
  if (filter?.to) qs.set("to", filter.to);

  const response = (await j(await fetch(`/api/tenant/audit-logs?${qs.toString()}`, { cache: "no-store" }))) as
    | { logs?: AuditLogRow[] }
    | null;
  const rows = Array.isArray(response?.logs) ? response.logs : [];

  return rows.map((row) => {
    const { title, description } = describeActivity(row);
    return {
      id: row.id,
      title,
      description,
      action: row.action,
      targetType: row.target_type ?? "console",
      targetId: row.target_id ?? null,
      actorUserId: row.actor_user_id ?? null,
      actorName: row.actor?.full_name ?? null,
      actorAvatarUrl: row.actor?.avatar_url ?? null,
      metadata: row.metadata ?? null,
      createdAt: row.created_at,
    };
  });
}

// --- Utils ---
export async function listHealthSamples(streamId: string): Promise<HealthSample[]> {
  const sid = guardId(streamId, "listHealthSamples");
  const rows = await j(await fetch(`/api/streams/${encodeURIComponent(sid)}/health`, { cache: "no-store" }));

  return (rows as ApiRow[]).map((r, i) => ({
    id: asString(r.id ?? i),
    ts: asString(r.ts ?? r.at ?? new Date().toISOString()),
    reachable: asBoolean(r.reachable ?? r.ok, false),
    bitrateKbps:
      r.bitrateKbps === undefined && r.bitrate_kbps === undefined
        ? undefined
        : asNumber(r.bitrateKbps ?? r.bitrate_kbps),
    downloadMs:
      r.downloadMs === undefined && r.download_ms === undefined
        ? undefined
        : asNumber(r.downloadMs ?? r.download_ms),
    err: asNullableString(r.err) ?? undefined,
  }));
}

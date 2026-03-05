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
  | "Animé"
  | "Manga"
  | "Autre";

export type Channel = {
  id: string;
  name: string;
  category: Category;
  slug: string;
  active: boolean;
  logo?: string | null;
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
  action: "CREATE" | "UPDATE" | "END" | "START" | "DELETE";
  targetType: "STREAM" | "VOD";
  targetId: string;
  userId?: string | null;
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

function guardId(id: unknown, ctx: string): string {
  const v = String(id ?? "").trim();
  if (!v || v === "undefined" || v === "null") {
    throw new Error(`${ctx}: id invalide`);
  }
  return v;
}

async function j(r: Response): Promise<any> {
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

const mapStream = (row: any): Stream => ({
  id: row.id,
  channelId: row.channel_id ?? row.channelId,
  title: row.title,
  hlsUrl: row.hls_url ?? row.hlsUrl,
  status: row.status,
  scheduledAt: row.scheduled_at ?? row.scheduledAt ?? null,
  description: row.description ?? null,
  poster: row.poster ?? null,
  latency: row.latency ?? "normal",
  dvrWindowSec: row.dvr_window_sec ?? row.dvrWindowSec ?? 10800,
  record: row.record ?? true,
  drm: row.drm ?? false,
  captions: (row.captions ?? []).map((c: any) => ({ id: c.id ?? c.lang, ...c })),
  markers: (row.markers ?? []).map((m: any, i: number) => ({
    id: m.id ?? String(i),
    ...m,
    at: Number(m.at),
  })),
  geo: row.geo ?? { allow: [], block: [] },
  createdAt: row.created_at ?? row.createdAt,
  updatedAt: row.updated_at ?? row.updatedAt,
  channel: row.channel,
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

const mapVod = (v: any): Vod => ({
  id: v.id,
  channelId: v.channel_id ?? v.channelId ?? null,
  title: v.title,
  hlsUrl: v.hls_url ?? v.hlsUrl,
  durationSec: v.duration_sec ?? v.durationSec ?? null,
  thumb: v.thumb ?? null,
  tags: v.tags ?? [],
  sourceStreamId: v.source_stream_id ?? v.sourceStreamId ?? null,
  createdAt: v.created_at ?? v.createdAt,
  channel: v.channel,
});

const mapProgram = (p: any): Program => ({
  id: p.id,
  channelId: p.channel_id ?? p.channelId ?? null,
  title: p.title,
  synopsis: p.synopsis ?? null,
  category: p.category ?? null,
  poster: p.poster ?? null,
  tags: p.tags ?? [],
  status: p.status ?? "draft",
  publishedAt: p.published_at ?? p.publishedAt ?? null,
  createdAt: p.created_at ?? p.createdAt,
  updatedAt: p.updated_at ?? p.updatedAt,
  channel: p.channel,
});

const mapProgramSlot = (s: any): ProgramSlot => ({
  id: s.id,
  programId: s.program_id ?? s.programId,
  channelId: s.channel_id ?? s.channelId ?? null,
  startsAt: s.starts_at ?? s.startsAt,
  endsAt: s.ends_at ?? s.endsAt ?? null,
  slotStatus: s.slot_status ?? s.slotStatus ?? "scheduled",
  visibility: s.visibility ?? "public",
  notes: s.notes ?? null,
  createdAt: s.created_at ?? s.createdAt,
  updatedAt: s.updated_at ?? s.updatedAt,
  program: s.program,
  channel: s.channel,
});

const mapReplay = (r: any): Replay => ({
  id: r.id,
  streamId: r.stream_id ?? r.streamId ?? null,
  channelId: r.channel_id ?? r.channelId ?? null,
  title: r.title,
  synopsis: r.synopsis ?? null,
  hlsUrl: r.hls_url ?? r.hlsUrl ?? null,
  poster: r.poster ?? null,
  durationSec: r.duration_sec ?? r.durationSec ?? null,
  replayStatus: r.replay_status ?? r.replayStatus ?? "draft",
  availableFrom: r.available_from ?? r.availableFrom ?? null,
  availableTo: r.available_to ?? r.availableTo ?? null,
  sourceHlsUrl: r.source_hls_url ?? r.sourceHlsUrl ?? null,
  clipStartAt: r.clip_start_at ?? r.clipStartAt ?? null,
  clipEndAt: r.clip_end_at ?? r.clipEndAt ?? null,
  processingError: r.processing_error ?? r.processingError ?? null,
  geo: r.geo ?? { allow: [], block: [] },
  createdAt: r.created_at ?? r.createdAt,
  updatedAt: r.updated_at ?? r.updatedAt,
  stream: r.stream,
  channel: r.channel,
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
  return (await j(await fetch("/api/channels", { cache: "no-store" }))) as Channel[];
}

export async function upsertChannel(input: Partial<Channel> & { id?: string }): Promise<Channel> {
  const headers = { "content-type": "application/json" };
  const body = JSON.stringify({
    name: input.name,
    category: (input.category ?? "Autre") as Category,
    active: input.active ?? true,
    logo: input.logo ?? null,
    slug: input.slug,
  });

  return input.id
    ? j(
        await fetch(`/api/channels/${encodeURIComponent(guardId(input.id, "upsertChannel"))}`, {
          method: "PATCH",
          headers,
          body,
        })
      )
    : j(await fetch(`/api/channels`, { method: "POST", headers, body }));
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
  return (rows as any[]).map(mapStream);
}

export async function getStream(id: string): Promise<Stream> {
  const sid = guardId(id, "getStream");
  const row = await j(await fetch(`/api/streams/${encodeURIComponent(sid)}`, { cache: "no-store" }));
  return mapStream(row);
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

  return mapStream(row);
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
  return mapStream(row);
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

// --- VOD ---
export async function listVod(): Promise<Vod[]> {
  const rows = await j(await fetch("/api/vod", { cache: "no-store" }));
  return (rows as any[]).map(mapVod);
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

  return mapVod(row);
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
  return (rows as any[]).map(mapProgram);
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

  return mapProgram(row);
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
  return mapProgram(row);
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
  return (rows as any[]).map(mapProgramSlot);
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

  return mapProgramSlot(row);
}

export async function publishProgramSlot(id: string): Promise<ProgramSlot> {
  const sid = guardId(id, "publishProgramSlot");
  const row = await j(
    await fetch(`/api/program-slots/${encodeURIComponent(sid)}/publish`, {
      method: "POST",
    })
  );
  return mapProgramSlot(row);
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
  return (rows as any[]).map(mapReplay);
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

  return mapReplay(row);
}

export async function publishReplay(id: string): Promise<Replay> {
  const sid = guardId(id, "publishReplay");
  const row = await j(
    await fetch(`/api/replays/${encodeURIComponent(sid)}/publish`, {
      method: "POST",
    })
  );
  return mapReplay(row);
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
export async function listActivities(): Promise<Activity[]> {
  const [streams, vods] = await Promise.all([listStreams().catch(() => []), listVod().catch(() => [])]);

  const A1: Activity[] = streams.slice(0, 40).map((s) => ({
    id: `s-${s.id}`,
    title: `Stream: ${s.title}`,
    action: s.status === "LIVE" ? "START" : s.status === "ENDED" ? "END" : "UPDATE",
    targetType: "STREAM",
    targetId: s.id,
    userId: undefined,
    createdAt: s.updatedAt || s.createdAt || new Date().toISOString(),
  }));

  const A2: Activity[] = vods.slice(0, 40).map((v) => ({
    id: `v-${v.id}`,
    title: `VOD: ${v.title}`,
    action: "CREATE",
    targetType: "VOD",
    targetId: v.id,
    userId: undefined,
    createdAt: v.createdAt || new Date().toISOString(),
  }));

  return [...A1, ...A2]
    .sort((a, b) => (a.createdAt === b.createdAt ? 0 : a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, 60);
}

// --- Utils ---
export async function listHealthSamples(streamId: string): Promise<HealthSample[]> {
  const sid = guardId(streamId, "listHealthSamples");
  const rows = await j(await fetch(`/api/streams/${encodeURIComponent(sid)}/health`, { cache: "no-store" }));

  return (rows as any[]).map((r, i) => ({
    id: r.id ?? String(i),
    ts: r.ts ?? r.at ?? new Date().toISOString(),
    reachable: r.reachable ?? (r.ok ?? false),
    bitrateKbps: r.bitrateKbps ?? r.bitrate_kbps,
    downloadMs: r.downloadMs ?? r.download_ms,
    err: r.err,
  }));
}

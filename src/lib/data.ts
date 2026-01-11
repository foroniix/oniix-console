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

export async function endLiveAndCreateReplay(id: string, opts?: { title?: string; durationSec?: number; thumb?: string }) {
  const sid = guardId(id, "endLiveAndCreateReplay");
  return j(
    await fetch(`/api/streams/${encodeURIComponent(sid)}/end`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(opts || {}),
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

export async function validateHls(
  url: string
): Promise<{ ok: boolean; status: number; bitrateKbps?: number; err?: string }> {
  const res = await j(await fetch(`/api/utils/validate-hls?url=${encodeURIComponent(url)}`, { cache: "no-store" }));
  return { ok: !!res.ok, status: Number(res.status ?? 0), bitrateKbps: res.bitrateKbps, err: res.err };
}

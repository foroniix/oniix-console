// src/lib/mock.ts

/* ===================== Utils ===================== */
const uid = () => Math.random().toString(36).slice(2, 10);
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/\-+/g, "-");

/* ===================== Channels ===================== */
export type Category = "News" | "Sports" | "Movies" | "Music" | "Other";

export type Channel = {
  id: string;
  name: string;
  category: Category;
  slug: string;
  active: boolean;
  logo?: string;
};

let channels: Channel[] = [
  { id: "c1", name: "ONIIX News", category: "News", slug: "oniix-news", active: true },
  { id: "c2", name: "ONIIX Sports", category: "Sports", slug: "oniix-sports", active: true },
];

export async function listChannels(): Promise<Channel[]> {
  return [...channels];
}

export async function upsertChannel(input: Partial<Channel> & { id?: string }): Promise<Channel> {
  if (!input.name?.trim()) throw new Error("name requis");
  const base: Channel = {
    id: input.id ?? uid(),
    name: input.name.trim(),
    category: (input.category ?? "Other") as Category,
    slug: input.slug?.trim() || slugify(input.name),
    active: input.active ?? true,
    logo: input.logo ?? "",
  };
  const i = channels.findIndex((c) => c.id === base.id);
  if (i >= 0) channels[i] = { ...channels[i], ...base };
  else channels = [base, ...channels];
  return channels.find((c) => c.id === base.id)!;
}

export async function toggleChannel(id: string, active: boolean): Promise<void> {
  channels = channels.map((c) => (c.id === id ? { ...c, active } : c));
}

/* ===================== Streams (HLS) ===================== */
export type StreamStatus = "OFFLINE" | "LIVE" | "ENDED";
export type LatencyMode = "normal" | "low" | "ultra-low";
export type Caption = { id: string; lang: string; label: string; url: string };
export type AdMarker = { id: string; tsSec: number; label?: string };
export type GeoRule = { allow: string[]; block: string[] };

export type Stream = {
  id: string;
  channelId: string;
  title: string;
  hlsUrl: string;
  status: StreamStatus;
  scheduledAt?: string | null;

  // Nouveautés
  description?: string;
  poster?: string;
  latency?: LatencyMode;
  dvrWindowSec?: number;
  record?: boolean;
  drm?: boolean;
  captions?: Caption[];
  markers?: AdMarker[];
  geo?: GeoRule;
  createdAt: string;
  updatedAt: string;
};

let streams: Stream[] = [
  {
    id: "s1",
    channelId: "c2",
    title: "Match du soir",
    hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    status: "LIVE",
    scheduledAt: null,
    description: "",
    poster: "",
    latency: "normal",
    dvrWindowSec: 10800,
    record: true,
    drm: false,
    captions: [],
    markers: [],
    geo: { allow: [], block: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "s2",
    channelId: "c1",
    title: "JT Midi",
    hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    status: "OFFLINE",
    scheduledAt: new Date(Date.now() + 3600e3).toISOString(),
    description: "",
    poster: "",
    latency: "normal",
    dvrWindowSec: 10800,
    record: true,
    drm: false,
    captions: [],
    markers: [],
    geo: { allow: [], block: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function listStreams(): Promise<Stream[]> {
  return [...streams];
}

export async function getStream(id: string): Promise<Stream | undefined> {
  return streams.find((s) => s.id === id);
}

export async function upsertStream(s: Partial<Stream> & { id?: string }): Promise<Stream> {
  if (!s.title?.trim() || !s.hlsUrl?.trim() || !s.channelId) throw new Error("incomplet");
  const now = new Date().toISOString();
  const obj: Stream = {
    id: s.id ?? uid(),
    channelId: s.channelId,
    title: s.title.trim(),
    hlsUrl: s.hlsUrl.trim(),
    status: (s.status ?? "OFFLINE") as StreamStatus,
    scheduledAt: s.scheduledAt ?? null,

    description: s.description ?? "",
    poster: s.poster ?? "",
    latency: (s.latency ?? "normal") as LatencyMode,
    dvrWindowSec: s.dvrWindowSec ?? 10800,
    record: s.record ?? true,
    drm: s.drm ?? false,
    captions: s.captions ?? [],
    markers: s.markers ?? [],
    geo: s.geo ?? { allow: [], block: [] },
    createdAt: s.id ? (streams.find((x) => x.id === s.id)?.createdAt ?? now) : now,
    updatedAt: now,
  };
  const i = streams.findIndex((x) => x.id === obj.id);
  if (i >= 0) streams[i] = { ...streams[i], ...obj };
  else streams = [obj, ...streams];
  return obj;
}

export async function updateStream(
  id: string,
  patch: Partial<Pick<Stream, "title" | "hlsUrl" | "status" | "scheduledAt" | "channelId" | "description" | "poster" | "latency" | "dvrWindowSec" | "record" | "drm" | "geo">>
): Promise<Stream> {
  const i = streams.findIndex((s) => s.id === id);
  if (i < 0) throw new Error("stream introuvable");
  const cur = streams[i];
  const next: Stream = {
    ...cur,
    title: patch.title?.trim() ?? cur.title,
    hlsUrl: patch.hlsUrl?.trim() ?? cur.hlsUrl,
    status: patch.status ?? cur.status,
    channelId: patch.channelId ?? cur.channelId,
    scheduledAt: patch.scheduledAt ?? cur.scheduledAt ?? null,
    description: patch.description ?? cur.description,
    poster: patch.poster ?? cur.poster,
    latency: patch.latency ?? cur.latency,
    dvrWindowSec: patch.dvrWindowSec ?? cur.dvrWindowSec,
    record: patch.record ?? cur.record,
    drm: patch.drm ?? cur.drm,
    geo: patch.geo ?? cur.geo,
    updatedAt: new Date().toISOString(),
  };
  streams[i] = next;
  return next;
}

export async function setStreamStatus(id: string, status: StreamStatus): Promise<void> {
  streams = streams.map((s) => (s.id === id ? { ...s, status, updatedAt: new Date().toISOString() } : s));
}

export async function removeStream(id: string): Promise<void> {
  streams = streams.filter((s) => s.id !== id);
}

/* ===== Markers / Captions helpers ===== */
export async function addMarker(streamId: string, tsSec: number, label?: string): Promise<AdMarker> {
  const s = streams.find((x) => x.id === streamId);
  if (!s) throw new Error("stream introuvable");
  const m: AdMarker = { id: uid(), tsSec, label };
  s.markers = [m, ...(s.markers ?? [])];
  s.updatedAt = new Date().toISOString();
  return m;
}

export async function removeMarker(streamId: string, markerId: string): Promise<void> {
  const s = streams.find((x) => x.id === streamId);
  if (!s) return;
  s.markers = (s.markers ?? []).filter((m) => m.id !== markerId);
  s.updatedAt = new Date().toISOString();
}

export async function addCaption(streamId: string, cap: Omit<Caption, "id">): Promise<Caption> {
  const s = streams.find((x) => x.id === streamId);
  if (!s) throw new Error("stream introuvable");
  const row: Caption = { id: uid(), ...cap };
  s.captions = [row, ...(s.captions ?? [])];
  s.updatedAt = new Date().toISOString();
  return row;
}

export async function removeCaption(streamId: string, captionId: string): Promise<void> {
  const s = streams.find((x) => x.id === streamId);
  if (!s) return;
  s.captions = (s.captions ?? []).filter((c) => c.id !== captionId);
  s.updatedAt = new Date().toISOString();
}

/* ===== Santé HLS (mock) ===== */
export type HealthSample = {
  id: string;
  streamId: string;
  ts: string;
  reachable: boolean;
  downloadMs?: number;
  bitrateKbps?: number;
  err?: string;
};

let health: HealthSample[] = [];

export async function pushHealthSample(sample: Omit<HealthSample, "id" | "ts"> & { ts?: string }) {
  const row: HealthSample = { id: uid(), ts: sample.ts ?? new Date().toISOString(), ...sample };
  health = [row, ...health].slice(0, 2000);
  return row;
}

export async function listHealthSamples(streamId: string, limit = 30): Promise<HealthSample[]> {
  return health.filter((h) => h.streamId === streamId).slice(0, limit);
}

export async function validateHls(_url: string): Promise<{ ok: boolean; bitrateKbps?: number; err?: string }> {
  const ok = Math.random() > 0.1;
  return ok
    ? { ok: true, bitrateKbps: 3000 + Math.round(Math.random() * 3000) }
    : { ok: false, err: "404 or CORS" };
}

/* ===================== News CMS ===================== */
export type NewsStatus = "DRAFT" | "PUBLISHED" | "SCHEDULED";

export type News = {
  id: string;
  title: string;
  slug: string;
  status: NewsStatus;
  cover?: string;
  content: string;           // markdown
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string | null;
};

let news: News[] = [
  {
    id: "n1",
    title: "Lancement Oniix Sports",
    slug: "lancement-oniix-sports",
    status: "PUBLISHED",
    cover: "",
    content: "Bienvenue sur **Oniix**.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function listNews(): Promise<News[]> {
  return [...news];
}

export async function getNews(id: string): Promise<News | undefined> {
  return news.find((n) => n.id === id);
}

export async function createNews(input: Partial<News>): Promise<News> {
  if (!input.title?.trim()) throw new Error("title requis");
  const n: News = {
    id: uid(),
    title: input.title.trim(),
    slug: input.slug?.trim() || slugify(input.title),
    status: (input.status ?? "DRAFT") as NewsStatus,
    cover: input.cover ?? "",
    content: input.content ?? "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scheduledAt: input.scheduledAt ?? null,
  };
  news = [n, ...news];
  return n;
}

export async function updateNews(id: string, patch: Partial<News>): Promise<News> {
  const i = news.findIndex((n) => n.id === id);
  if (i < 0) throw new Error("not found");
  const base = news[i];
  const next: News = {
    ...base,
    ...patch,
    title: patch.title?.trim() || base.title,
    slug: patch.slug?.trim() || base.slug,
    updatedAt: new Date().toISOString(),
  };
  news[i] = next;
  return next;
}

export async function removeNews(id: string): Promise<void> {
  news = news.filter((n) => n.id !== id);
}

/* ===================== Dashboard KPIs ===================== */
export type Kpis = {
  activeUsers: number;
  concurrents: number;
  liveStreams: number;
  errors1h: number;
};

export type Point = { t: string; v: number };

export async function getKpis(): Promise<Kpis> {
  return { activeUsers: 842, concurrents: 312, liveStreams: streams.filter(s=>s.status==="LIVE").length, errors1h: 7 };
}

export async function timeseriesViewers(): Promise<Point[]> {
  const now = Date.now();
  return Array.from({ length: 24 }).map((_, i) => ({
    t: new Date(now - (23 - i) * 15 * 60 * 1000).toISOString(),
    v: Math.round(180 + 160 * Math.sin(i / 3) + Math.random() * 60),
  }));
}

export async function topChannels(): Promise<Array<{ id: string; name: string; viewers: number }>> {
  return [
    { id: "c2", name: "ONIIX Sports", viewers: 1580 },
    { id: "c1", name: "ONIIX News", viewers: 1040 },
  ];
}

export async function recentEvents(): Promise<
  Array<{ id: string; type: "STREAM_START" | "STREAM_END" | "ERROR"; at: string; meta: string }>
> {
  const now = Date.now();
  return [
    { id: "e1", type: "STREAM_START", at: new Date(now - 5 * 60 * 1000).toISOString(), meta: "ONIIX Sports • Match du soir" },
    { id: "e2", type: "ERROR",        at: new Date(now - 18 * 60 * 1000).toISOString(), meta: "HLS 404 • Cinema Max" },
    { id: "e3", type: "STREAM_END",   at: new Date(now - 40 * 60 * 1000).toISOString(), meta: "JT Midi • ONIIX News" },
  ];
}

/* ===================== Users ===================== */
export type Role = "admin" | "editor" | "viewer";
export type User = {
  id: string;
  name: string;
  phone: string;       // E.164 +229…
  role: Role;
  suspended: boolean;
  createdAt: string;
};

let users: User[] = [
  { id: "u1", name: "Admin",  phone: "+2290140123456", role: "admin",  suspended: false, createdAt: new Date().toISOString() },
  { id: "u2", name: "Rédac",  phone: "+2290143123456", role: "editor", suspended: false, createdAt: new Date().toISOString() },
  { id: "u3", name: "Viewer", phone: "+2290193123456", role: "viewer", suspended: false, createdAt: new Date().toISOString() },
];

export async function listUsers(): Promise<User[]> {
  return [...users];
}

export async function upsertUser(u: Partial<User> & { id?: string }): Promise<User> {
  if (!u.name?.trim() || !u.phone?.trim()) throw new Error("name/phone requis");
  const id = u.id ?? uid();
  const next: User = {
    id,
    name: u.name.trim(),
    phone: u.phone.trim(),
    role: (u.role ?? "viewer") as Role,
    suspended: u.suspended ?? false,
    createdAt: u.createdAt ?? new Date().toISOString(),
  };
  const i = users.findIndex(x => x.id === id);
  if (i >= 0) users[i] = { ...users[i], ...next }; else users = [next, ...users];
  return next;
}

export async function setUserRole(id: string, role: Role): Promise<void> {
  users = users.map(u => u.id === id ? { ...u, role } : u);
}

export async function setUserSuspended(id: string, suspended: boolean): Promise<void> {
  users = users.map(u => u.id === id ? { ...u, suspended } : u);
}

/* ===================== Activity Log ===================== */
export type Activity = {
  id: string;
  userId: string;
  action: string;
  targetType: "channel" | "stream" | "news" | "user" | "system";
  targetId?: string;
  createdAt: string;
};

let activities: Activity[] = [
  { id: "a1", userId: "u1", action: "create channel", targetType: "channel", targetId: "c1", createdAt: new Date().toISOString() },
];

export async function listActivities(): Promise<Activity[]> {
  return [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function logActivity(act: Omit<Activity, "id" | "createdAt">): Promise<void> {
  activities = [
    {
      id: uid(),
      createdAt: new Date().toISOString(),
      ...act,
    },
    ...activities,
  ];
}

/* ===== VOD (replays) ===== */
export type Vod = {
  id: string;
  channelId: string;
  title: string;
  hlsUrl: string;
  durationSec?: number;
  thumb?: string;
  tags?: string[];
  createdAt: string;
  sourceStreamId?: string|null;  // si issu d’un live
};

let vods: Vod[] = [];

export async function listVods(params?: { channelId?: string }): Promise<Vod[]> {
  const all = [...vods].sort((a,b)=> (a.createdAt < b.createdAt?1:-1));
  return params?.channelId ? all.filter(v=>v.channelId===params.channelId) : all;
}

export async function upsertVod(v: Partial<Vod> & { id?: string }): Promise<Vod> {
  if (!v.channelId || !v.title || !v.hlsUrl) throw new Error("incomplet");
  const obj: Vod = {
    id: v.id ?? uid(),
    channelId: v.channelId,
    title: v.title.trim(),
    hlsUrl: v.hlsUrl.trim(),
    durationSec: v.durationSec ?? undefined,
    thumb: v.thumb ?? "",
    tags: v.tags ?? [],
    createdAt: new Date().toISOString(),
    sourceStreamId: v.sourceStreamId ?? null,
  };
  const i = vods.findIndex(x=>x.id===obj.id);
  if (i>=0) vods[i] = { ...vods[i], ...obj };
  else vods = [obj, ...vods];
  return obj;
}

export async function removeVod(id: string) { vods = vods.filter(v=>v.id!==id); }

/* ===== Convertir un live en replay ===== */
export async function endLiveAndCreateReplay(streamId: string, opts?: { title?: string; thumb?: string; durationSec?: number }): Promise<Vod> {
  const s = streams.find(x=>x.id===streamId);
  if (!s) throw new Error("stream introuvable");
  await setStreamStatus(streamId, "ENDED");
  return upsertVod({
    channelId: s.channelId,
    title: opts?.title ?? s.title,
    hlsUrl: s.hlsUrl,
    durationSec: opts?.durationSec,
    thumb: opts?.thumb,
    sourceStreamId: s.id,
    tags: ["replay"],
  });
}





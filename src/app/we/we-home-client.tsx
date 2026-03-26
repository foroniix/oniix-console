"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  PlayCircle,
  Radio,
  RefreshCw,
  Sparkles,
  Tv2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useWebViewerAuth } from "@/components/we/web-viewer-auth";

type GridSlot = {
  id: string;
  title: string;
  poster: string | null;
  starts_at: string;
  ends_at: string | null;
  slot_status: string;
  visibility: string;
  notes: string | null;
};

type GridChannel = {
  channel: {
    id: string;
    tenant_id: string | null;
    name: string;
    logo: string | null;
    category: string | null;
    slug: string | null;
  };
  live_stream?: {
    id: string;
    tenant_id: string;
    channel_id: string;
    title: string;
    poster: string | null;
    status: "OFFLINE" | "LIVE" | "ENDED";
    updated_at: string | null;
  } | null;
  now: GridSlot | null;
  next: GridSlot | null;
  slots: GridSlot[];
};

type ReplayItem = {
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
};

type LivePortalResponse = {
  ok?: boolean;
  error?: string;
  grid?: GridChannel[];
  replays?: ReplayItem[];
};

type WebCategory = "Tout" | string;

function formatClock(value: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(value: number | null) {
  if (!value || value <= 0) return null;
  const hours = Math.floor(value / 3600);
  const mins = Math.floor((value % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins.toString().padStart(2, "0")}`;
  return `${Math.max(1, mins)} min`;
}

function formatPercent(value: number | null | undefined) {
  if (!value || value <= 0) return null;
  return `${value}%`;
}

function normalizeLiveCategory(channel: GridChannel["channel"]) {
  const raw = `${channel.category ?? ""} ${channel.name ?? ""}`.trim().toLowerCase();
  if (!raw) return "General";
  if (raw.includes("sport") || raw.includes("foot") || raw.includes("ball") || raw.includes("racing")) {
    return "Sport";
  }
  if (raw.includes("anim") || raw.includes("manga") || raw.includes("toon") || raw.includes("otaku")) {
    return "Manga";
  }
  if (
    raw.includes("movie") ||
    raw.includes("film") ||
    raw.includes("serie") ||
    raw.includes("series") ||
    raw.includes("cinema")
  ) {
    return "Films & series";
  }
  if (
    raw.includes("news") ||
    raw.includes("actualite") ||
    raw.includes("business") ||
    raw.includes("economie")
  ) {
    return "Actualites";
  }
  const source = (channel.category ?? "").trim();
  if (!source) return "General";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function SectionHeader({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-2 font-[var(--font-we-display)] text-2xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        {detail ? <p className="mt-2 text-sm text-slate-400">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function LiveLaneCard({ lane }: { lane: GridChannel }) {
  const category = normalizeLiveCategory(lane.channel);

  return (
    <Link
      href={lane.live_stream?.id ? `/we/${lane.live_stream.id}` : "/"}
      className="group overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,12,12,0.98),rgba(4,4,4,0.98))] transition hover:border-white/18 hover:bg-white/[0.05]"
    >
      <div className="relative aspect-[16/10] bg-black">
        {lane.live_stream?.poster || lane.now?.poster ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.04]"
            style={{ backgroundImage: `url('${lane.live_stream?.poster || lane.now?.poster}')` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.88))]" />
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3 py-1 text-[11px] font-medium text-white">
          <Radio className="h-3.5 w-3.5 text-red-400" />
          En direct
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{category}</p>
          <h3 className="mt-2 line-clamp-2 text-xl font-semibold text-white">{lane.channel.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-slate-300">
            {lane.now?.title || lane.live_stream?.title || "Direct disponible maintenant"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 p-5 text-sm text-slate-400">
        <span className="truncate">
          {lane.next?.title ? `${formatClock(lane.next.starts_at)} - ${lane.next.title}` : "Suite a venir"}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function ReplayCard({ replay }: { replay: ReplayItem }) {
  return (
    <Link
      href={`/we/replays/${replay.id}`}
      className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] transition hover:border-white/18 hover:bg-white/[0.05]"
    >
      <div className="relative aspect-[16/10] bg-black">
        {replay.poster ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.04]"
            style={{ backgroundImage: `url('${replay.poster}')` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.9))]" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{replay.channel.name || "Replay"}</p>
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-white">{replay.title}</h3>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-4 text-sm text-slate-400">
        <span>{formatDuration(replay.duration_sec) || "Disponible"}</span>
        <PlayCircle className="h-4 w-4 shrink-0" />
      </div>
    </Link>
  );
}

function ContinueReplayCard({
  item,
}: {
  item: ReturnType<typeof useWebViewerAuth>["replayContinueWatching"][number];
}) {
  return (
    <Link
      href={item.href}
      className="group overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] transition hover:border-white/18 hover:bg-white/[0.05]"
    >
      <div className="relative aspect-[16/10] bg-black">
        {item.poster_url ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.04]"
            style={{ backgroundImage: `url('${item.poster_url}')` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.9))]" />
        {item.percent_complete ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div
              className="h-full bg-white"
              style={{ width: `${Math.min(100, Math.max(0, item.percent_complete))}%` }}
            />
          </div>
        ) : null}
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{item.channel_name || "Replay"}</p>
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-white">{item.title}</h3>
        </div>
      </div>
      <div className="p-4 text-sm text-slate-400">
        {formatPercent(item.percent_complete)
          ? `Reprendre a ${formatPercent(item.percent_complete)}`
          : "Reprendre la lecture"}
      </div>
    </Link>
  );
}

export default function WebLiveHomeClient() {
  const { replayContinueWatching } = useWebViewerAuth();
  const [grid, setGrid] = useState<GridChannel[]>([]);
  const [replays, setReplays] = useState<ReplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<WebCategory>("Tout");

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/web/live?includeReplays=1", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as LivePortalResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Impossible de charger la TV web.");
      }

      setGrid(Array.isArray(payload.grid) ? payload.grid : []);
      setReplays(Array.isArray(payload.replays) ? payload.replays : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger la TV web.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const timer = setInterval(() => void load(true), 45_000);
    return () => clearInterval(timer);
  }, [load]);

  const categories = useMemo<WebCategory[]>(() => {
    const items = Array.from(new Set(grid.map((lane) => normalizeLiveCategory(lane.channel)))).sort((a, b) =>
      a.localeCompare(b, "fr")
    );
    return ["Tout", ...items];
  }, [grid]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory("Tout");
    }
  }, [activeCategory, categories]);

  const filteredGrid = useMemo(() => {
    if (activeCategory === "Tout") return grid;
    return grid.filter((lane) => normalizeLiveCategory(lane.channel) === activeCategory);
  }, [activeCategory, grid]);

  const filteredReplays = useMemo(() => {
    if (activeCategory === "Tout") return replays;
    const allowedChannelIds = new Set(
      filteredGrid.map((lane) => lane.channel.id).filter((value): value is string => Boolean(value))
    );
    return replays.filter((replay) => replay.channel.id && allowedChannelIds.has(replay.channel.id));
  }, [activeCategory, filteredGrid, replays]);

  const featured = useMemo(
    () => filteredGrid.find((lane) => lane.live_stream?.id) ?? filteredGrid[0] ?? null,
    [filteredGrid]
  );

  const categorySummary = useMemo(
    () =>
      Array.from(
        filteredGrid.reduce<Map<string, number>>((map, lane) => {
          const key = normalizeLiveCategory(lane.channel);
          map.set(key, (map.get(key) ?? 0) + 1);
          return map;
        }, new Map())
      ).sort((left, right) => right[1] - left[1]),
    [filteredGrid]
  );

  return (
    <main className="min-h-[calc(100dvh-76px)] text-white">
      <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Oniix streaming"
          title="TV en direct, replays et catalogue web"
          detail="Un portail public pense pour le visionnage desktop."
          action={
            <button
              type="button"
              onClick={() => void load(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 transition hover:bg-white/[0.08]"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          }
        />

        {loading ? (
          <div className="flex min-h-[48vh] items-center justify-center rounded-[34px] border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
            {error}
          </div>
        ) : (
          <>
            {featured ? (
              <section className="grid gap-5 xl:grid-cols-[1.32fr_0.68fr]">
                <Link
                  href={featured.live_stream?.id ? `/we/${featured.live_stream.id}` : "/"}
                  className="group relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#0b0b0b,#030303)] p-7 shadow-[0_40px_120px_rgba(0,0,0,0.42)]"
                >
                  {featured.live_stream?.poster || featured.now?.poster ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-35 transition duration-700 group-hover:scale-[1.04]"
                      style={{ backgroundImage: `url('${featured.live_stream?.poster || featured.now?.poster}')` }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,2,2,0.98),rgba(2,2,2,0.78),rgba(2,2,2,0.96))]" />

                  <div className="relative flex h-full flex-col justify-between gap-10">
                    <div className="space-y-6">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                        <Radio className="h-3.5 w-3.5 text-red-400" />
                        {normalizeLiveCategory(featured.channel)}
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">{featured.channel.name}</p>
                        <h1 className="mt-3 max-w-3xl font-[var(--font-we-display)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                          {featured.live_stream?.title || featured.now?.title || featured.channel.name}
                        </h1>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                          {featured.now?.title
                            ? `En cours: ${featured.now.title}`
                            : "Le direct est disponible instantanement depuis votre navigateur."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex h-12 items-center rounded-full bg-white px-5 text-sm font-medium text-black transition group-hover:bg-slate-200">
                        Ouvrir le direct
                      </span>
                      <span className="inline-flex h-12 items-center rounded-full border border-white/10 px-5 text-sm text-slate-300">
                        {featured.next?.title
                          ? `${formatClock(featured.next.starts_at)} - ${featured.next.title}`
                          : "Suite a venir"}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                  <StatCard
                    label="Chaines live"
                    value={String(filteredGrid.length)}
                    detail="Disponibles maintenant sur le portail public"
                  />
                  <StatCard
                    label="Univers"
                    value={String(Math.max(1, categorySummary.length))}
                    detail="Sport, actualites, divertissement et plus"
                  />
                  <Link
                    href="/we/catalog"
                    className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 transition hover:border-white/18 hover:bg-white/[0.07]"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Catalogue</p>
                    <p className="mt-3 text-lg font-semibold text-white">Films, series et collections</p>
                    <p className="mt-2 text-sm text-slate-400">Basculer vers l espace VOD</p>
                  </Link>
                </div>
              </section>
            ) : null}

            <section className="rounded-[30px] border border-white/10 bg-white/[0.025] p-5">
              <SectionHeader
                eyebrow="Bouquets"
                title="Par univers"
                detail="Filtrez rapidement les chaines par ligne editoriale."
              />
              <div className="mt-5 flex flex-wrap gap-2">
                {categories.map((category) => {
                  const active = activeCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`inline-flex h-11 items-center rounded-full border px-4 text-sm transition ${
                        active
                          ? "border-white/14 bg-white text-black"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </section>

            {replayContinueWatching.length > 0 ? (
              <section className="space-y-5">
                <SectionHeader
                  eyebrow="Reprise"
                  title="Continuer vos replays"
                  detail="Retrouvez votre lecture en cours sur le web."
                />
                <div className="grid gap-4 lg:grid-cols-3">
                  {replayContinueWatching.slice(0, 3).map((item) => (
                    <ContinueReplayCard key={`replay:${item.playable_id}`} item={item} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-5">
              <SectionHeader
                eyebrow="Directs"
                title="Maintenant a l'antenne"
                detail="Un acces desktop simple pour regarder les chaines actives."
                action={
                  <Link
                    href="/we/catalog"
                    className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <Tv2 className="mr-2 h-4 w-4" />
                    Ouvrir le catalogue
                  </Link>
                }
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredGrid.map((lane) => (
                  <LiveLaneCard key={lane.channel.id} lane={lane} />
                ))}
              </div>
              {filteredGrid.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-500">
                  Aucun direct public n est encore disponible dans cette categorie.
                </div>
              ) : null}
            </section>

            <section id="replays" className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5">
                <SectionHeader
                  eyebrow="Selection"
                  title="Vue d'ensemble"
                  detail="Le portail se concentre sur le direct, le replay et le catalogue."
                />
                <div className="mt-5 space-y-3">
                  <div className="rounded-[22px] border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-2 text-white">
                      <Sparkles className="h-4 w-4 text-slate-400" />
                      <p className="text-sm font-medium">Visionnage desktop</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Navigation rapide entre live, grille, replays et catalogue.
                    </p>
                  </div>
                  {categorySummary.map(([category, count]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between rounded-[18px] border border-white/10 bg-black/30 px-4 py-3"
                    >
                      <span className="text-sm text-white">{category}</span>
                      <span className="text-sm text-slate-400">{count} chaine(s)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,10,10,0.96),rgba(3,3,3,0.98))] p-5">
                <SectionHeader
                  eyebrow="Replays"
                  title="Selection recente"
                  detail="Les derniers programmes rattrapables sur le web."
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredReplays.slice(0, 6).map((replay) => (
                    <ReplayCard key={replay.id} replay={replay} />
                  ))}
                </div>
                {filteredReplays.length === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-500">
                    Aucun replay public n est encore disponible.
                  </div>
                ) : null}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, Clapperboard, Loader2, Radio, RefreshCw } from "lucide-react";
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

export default function WebLiveHomeClient() {
  const { replayContinueWatching } = useWebViewerAuth();
  const [grid, setGrid] = useState<GridChannel[]>([]);
  const [replays, setReplays] = useState<ReplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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

  const featured = useMemo(
    () => grid.find((lane) => lane.live_stream?.id) ?? null,
    [grid]
  );

  return (
    <main className="min-h-[calc(100dvh-73px)] bg-[#030303] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-[360px] w-[360px] rounded-full bg-white/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-white/[0.03] blur-[140px]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Web TV</p>
            <h1 className="mt-2 font-[var(--font-we-display)] text-3xl font-semibold tracking-tight text-white">
              Directs Oniix
            </h1>
          </div>

          <button
            type="button"
            onClick={() => void load(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 transition hover:bg-white/[0.08]"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/10 p-5 text-sm text-red-100">
            {error}
          </div>
        ) : (
          <>
            {featured ? (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <Link
                  href={`/we/${featured.live_stream?.id}`}
                  className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,#0a0a0a,#050505)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.42)]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.04),transparent_24%)]" />
                  <div className="relative flex h-full flex-col justify-between gap-6">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      <Radio className="h-3.5 w-3.5 text-red-400" />
                      En direct
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">{featured.channel.name}</p>
                      <h2 className="mt-2 font-[var(--font-we-display)] text-3xl font-semibold tracking-tight text-white">
                        {featured.live_stream?.title || featured.now?.title || featured.channel.name}
                      </h2>
                      <p className="mt-3 text-sm text-slate-300">
                        {featured.now?.title ? `En cours : ${featured.now.title}` : "Aucun programme éditorial en cours"}
                      </p>
                    </div>
                    <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white transition group-hover:bg-white/[0.09]">
                      Ouvrir le direct
                    </div>
                  </div>
                </Link>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Chaînes live</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{grid.length}</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Replays</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{replays.length}</p>
                  </div>
                  <Link
                    href="/we/catalog"
                    className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Catalogue</p>
                    <p className="mt-3 text-lg font-semibold text-white">Ouvrir films et séries</p>
                  </Link>
                </div>
              </div>
            ) : null}

            {replayContinueWatching.length > 0 ? (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-[var(--font-we-display)] text-2xl font-semibold text-white">
                    Continuer un replay
                  </h2>
                  <span className="text-sm text-slate-500">{replayContinueWatching.length} reprise(s)</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {replayContinueWatching.map((item) => (
                    <Link
                      key={`replay:${item.playable_id}`}
                      href={item.href}
                      className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <div className="relative aspect-[16/10] bg-black">
                        {item.poster_url ? (
                          <div
                            className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                            style={{ backgroundImage: `url('${item.poster_url}')` }}
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.84))]" />
                        {item.percent_complete ? (
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                            <div
                              className="h-full bg-white"
                              style={{ width: `${Math.min(100, Math.max(0, item.percent_complete))}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-3 p-5">
                        <div>
                          <p className="text-xs text-slate-500">{item.channel_name || "Replay"}</p>
                          <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-white">{item.title}</h3>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                          <span>
                            {formatPercent(item.percent_complete)
                              ? `Reprendre à ${formatPercent(item.percent_complete)}`
                              : "Reprendre la lecture"}
                          </span>
                          <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-[var(--font-we-display)] text-2xl font-semibold text-white">Chaînes en direct</h2>
                <span className="text-sm text-slate-500">{grid.length} chaînes</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {grid.map((lane) => (
                    <Link
                      key={lane.channel.id}
                      href={lane.live_stream?.id ? `/we/${lane.live_stream.id}` : "/"}
                      className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
                    >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{lane.channel.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{lane.channel.category || "TV"}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-medium text-red-200">
                        <Radio className="h-3 w-3" />
                        Live
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">En cours</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-100">
                          {lane.now?.title || lane.live_stream?.title || "Direct sans habillage éditorial"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">À suivre</p>
                        <p className="mt-1 text-sm text-slate-300">
                          {lane.next?.title ? `${formatClock(lane.next.starts_at)} · ${lane.next.title}` : "À venir"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4 text-slate-400" />
                <h2 className="font-[var(--font-we-display)] text-xl font-semibold text-white">Replays récents</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {replays.slice(0, 6).map((replay) => (
                  <Link
                    key={replay.id}
                    href={`/we/replays/${replay.id}`}
                    className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <p className="line-clamp-2 text-sm font-semibold text-white">{replay.title}</p>
                    <p className="mt-2 text-xs text-slate-400">{replay.channel.name || "Replay"}</p>
                    <p className="mt-3 text-xs text-slate-500">{formatDuration(replay.duration_sec) || "Replay"}</p>
                  </Link>
                ))}
                {replays.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-500">
                    Aucun replay public n&apos;est encore disponible.
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

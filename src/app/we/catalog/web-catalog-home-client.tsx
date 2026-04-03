"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Clapperboard,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useWebViewerAuth } from "@/components/we/web-viewer-auth";
import { WEB_MEDIA_FALLBACKS } from "@/features/web-viewer/media/media.constants";
import { MediaThumb } from "@/features/web-viewer/media/media-thumb";
import { SectionHeader } from "@/features/web-viewer/ui/section-header";
import { StatCard } from "@/features/web-viewer/ui/stat-card";
type CatalogItem = {
  id: string;
  tenant_id: string;
  title_type: "movie" | "series";
  slug: string;
  title: string;
  original_title: string | null;
  short_synopsis: string | null;
  long_synopsis: string | null;
  release_year: number | null;
  maturity_rating: string | null;
  original_language: string | null;
  editorial_status: string;
  episode_count: number;
  has_playback: boolean;
  storefront: string;
  featured_rank: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  logo_url: string | null;
};

type CatalogListResponse = {
  ok?: boolean;
  error?: string;
  items?: CatalogItem[];
};

function getCatalogFallback(item: CatalogItem) {
  return item.title_type === "movie" ? WEB_MEDIA_FALLBACKS.poster : WEB_MEDIA_FALLBACKS.backdrop;
}

function formatPercent(value: number | null | undefined) {
  if (!value || value <= 0) return null;
  return `${value}%`;
}

function ContinueCard({
  item,
}: {
  item: ReturnType<typeof useWebViewerAuth>["continueWatching"][number];
}) {
  const artwork = item.poster_url || WEB_MEDIA_FALLBACKS.poster;

  return (
    <Link
      href={`/we/catalog/${item.title_id}`}
      className="group overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] transition hover:border-white/18 hover:bg-white/[0.06]"
    >
      <div className="relative aspect-[16/10] bg-black">
        <MediaThumb
          src={artwork}
          fallbackSrc={WEB_MEDIA_FALLBACKS.poster}
          alt={item.title}
          className="absolute inset-0"
          imgClassName="transition duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(2,6,12,0.92))]" />
        {item.percent_complete ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div
              className="h-full bg-white"
              style={{ width: `${Math.min(100, Math.max(0, item.percent_complete))}%` }}
            />
          </div>
        ) : null}
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {item.parent_title ? item.parent_title : item.title_type === "movie" ? "Film" : "Serie"}
          </p>
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

function WatchlistCard({
  item,
}: {
  item: ReturnType<typeof useWebViewerAuth>["watchlist"][number];
}) {
  const artwork = item.poster_url || WEB_MEDIA_FALLBACKS.live;

  return (
    <Link
      href={`/we/catalog/${item.title_id}`}
      className="group overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] transition hover:border-white/18 hover:bg-white/[0.06]"
    >
      <div className="relative aspect-[4/5] bg-black">
        <MediaThumb
          src={artwork}
          fallbackSrc={WEB_MEDIA_FALLBACKS.live}
          alt={item.title}
          className="absolute inset-0"
          imgClassName="transition duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(2,6,12,0.92))]" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {item.title_type === "movie" ? "Film" : "Serie"}
          </p>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold text-white">
            {item.parent_title ? `${item.parent_title} - ${item.title}` : item.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

function CatalogCard({ item }: { item: CatalogItem }) {
  const artwork = item.poster_url || item.backdrop_url || getCatalogFallback(item);

  return (
    <Link
      href={`/we/catalog/${item.id}`}
      className="group overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] transition hover:border-white/18 hover:bg-white/[0.06]"
    >
      <div className="relative aspect-[16/10] bg-black">
        <MediaThumb
          src={artwork}
          fallbackSrc={getCatalogFallback(item)}
          alt={item.title}
          className="absolute inset-0"
          imgClassName="transition duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(2,6,12,0.9))]" />
        <div className="absolute left-4 top-4 inline-flex items-center rounded-full border border-white/10 bg-black/65 px-3 py-1 text-[11px] font-medium text-white">
          {item.title_type === "movie" ? "Film" : `${item.episode_count} episodes`}
        </div>
        {item.has_playback ? (
          <div className="absolute right-4 top-4 inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-950">
            Lecture
          </div>
        ) : null}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="line-clamp-2 text-lg font-semibold text-white">{item.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
            {item.short_synopsis || item.long_synopsis || "Disponible sur le web"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 p-4 text-sm text-slate-400">
        <span>
          {item.release_year || "--"} {item.maturity_rating ? ` - ${item.maturity_rating}` : ""}
        </span>
        <Clapperboard className="h-4 w-4 shrink-0" />
      </div>
    </Link>
  );
}

export default function WebCatalogHomeClient() {
  const { continueWatching, watchlist } = useWebViewerAuth();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "series">("all");

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/web/catalog", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as CatalogListResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Impossible de charger le catalogue web.");
      }

      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le catalogue web.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.title_type !== typeFilter) return false;
      if (!normalizedQuery) return true;
      return [item.title, item.original_title, item.short_synopsis]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [items, query, typeFilter]);

  const featured = useMemo(() => {
    const ranked = [...filteredItems].sort((left, right) => {
      const leftRank = left.featured_rank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.featured_rank ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.title.localeCompare(right.title, "fr");
    });
    return ranked[0] ?? null;
  }, [filteredItems]);

  const movies = useMemo(() => filteredItems.filter((item) => item.title_type === "movie"), [filteredItems]);
  const series = useMemo(() => filteredItems.filter((item) => item.title_type === "series"), [filteredItems]);
  const playableCount = useMemo(() => filteredItems.filter((item) => item.has_playback).length, [filteredItems]);

  return (
    <main className="min-h-[calc(100dvh-76px)] text-white">
      <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(135deg,rgba(7,12,20,0.96),rgba(3,5,9,0.98))] p-7 shadow-[0_40px_120px_rgba(0,0,0,0.42)]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-24"
            >
              <MediaThumb
                src={featured?.backdrop_url || featured?.poster_url || WEB_MEDIA_FALLBACKS.backdrop}
                fallbackSrc={WEB_MEDIA_FALLBACKS.backdrop}
                alt="Catalogue Oniix"
                className="absolute inset-0"
              />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,9,0.98),rgba(3,5,9,0.78),rgba(3,5,9,0.96))]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  VOD
                </div>
                <div>
                  <h1 className="max-w-3xl font-[var(--font-we-display)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                    Films, series et collections.
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                    Retrouvez les titres publies sur le web, reprenez la lecture et filtrez rapidement par type.
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative min-w-[240px] flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Rechercher un film ou une serie"
                        className="h-11 w-full rounded-full border border-white/10 bg-black/45 pl-10 pr-4 text-sm text-white outline-none transition focus:border-white/20"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {([
                        { value: "all", label: "Tout" },
                        { value: "movie", label: "Films" },
                        { value: "series", label: "Series" },
                      ] as const).map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setTypeFilter(item.value)}
                          className={`inline-flex h-10 items-center rounded-full border px-4 text-sm transition ${
                            typeFilter === item.value
                              ? "border-white/14 bg-white text-slate-950"
                              : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={featured ? `/we/catalog/${featured.id}` : "/we/catalog"}
                  className="inline-flex h-12 items-center rounded-full bg-white px-5 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                >
                  Ouvrir la selection
                </Link>
                <Link
                  href="/"
                  className="inline-flex h-12 items-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm text-slate-200 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Revenir a la TV
                </Link>
                <button
                  type="button"
                  onClick={() => void load(true)}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm text-white transition hover:bg-white/[0.08]"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Actualiser
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                  label="Titres"
                  value={loading ? "--" : String(filteredItems.length)}
                  detail="Disponibles dans le filtre actif"
                />
                <StatCard
                  label="Lecture"
                  value={loading ? "--" : String(playableCount)}
                  detail="Titres directement lisibles sur le web"
                />
                <StatCard
                  label="Bibliotheque"
                  value={String(watchlist.length)}
                  detail="Elements sauvegardes pour plus tard"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="flex min-h-[25rem] items-center justify-center rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))]">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : featured ? (
              <Link
                href={`/we/catalog/${featured.id}`}
                className="group relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,12,20,0.96),rgba(3,5,9,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.32)]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-34 transition duration-700 group-hover:scale-[1.04]"
                >
                  <MediaThumb
                    src={featured.backdrop_url || featured.poster_url || getCatalogFallback(featured)}
                    fallbackSrc={getCatalogFallback(featured)}
                    alt={featured.title}
                    className="absolute inset-0 opacity-34"
                    imgClassName="transition duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,9,0.35),rgba(3,5,9,0.94))]" />

                <div className="relative flex h-full flex-col justify-between gap-10">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                      <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                      Mise en avant
                    </div>
                    <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {featured.title_type === "movie" ? "Film" : "Serie"}
                    </p>
                    <h2 className="mt-3 font-[var(--font-we-display)] text-3xl font-semibold tracking-tight text-white">
                      {featured.title}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                      {featured.short_synopsis || featured.long_synopsis || "Disponible en lecture web."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Metadonnees</p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {featured.release_year || "--"}
                        {featured.maturity_rating ? ` - ${featured.maturity_rating}` : ""}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Playback</p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {featured.has_playback ? "Pret a lire" : "Detail disponible"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-[34px] border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm leading-7 text-slate-400">
                Aucun titre public ne correspond encore au filtre actif.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href={continueWatching.length > 0 ? "#continue" : "/"}
                className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 transition hover:border-white/18 hover:bg-white/[0.08]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Reprise</p>
                  <PlayCircle className="h-4 w-4 text-slate-300" />
                </div>
                <h3 className="mt-3 text-xl font-semibold text-white">
                  {continueWatching.length > 0 ? "Continuer la lecture" : "Retourner au direct"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {continueWatching.length > 0
                    ? "Retrouver vos titres en cours avec progression synchronisee."
                    : "Revenir aux chaines et replays sans quitter le portail."}
                </p>
                <div className="mt-4 inline-flex items-center text-sm text-slate-200">
                  Ouvrir
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>

              <Link
                href={watchlist.length > 0 ? "#watchlist" : "/we/catalog"}
                className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 transition hover:border-white/18 hover:bg-white/[0.08]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Bibliotheque</p>
                  <Bookmark className="h-4 w-4 text-slate-300" />
                </div>
                <h3 className="mt-3 text-xl font-semibold text-white">Ma liste</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {watchlist.length > 0
                    ? `${watchlist.length} titre(s) enregistres pour y revenir plus tard.`
                    : "Ajoutez des titres pour les retrouver rapidement."}
                </p>
                <div className="mt-4 inline-flex items-center text-sm text-slate-200">
                  Explorer
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/10 p-5 text-sm text-red-100">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[20vh] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        ) : (
          <>
            {continueWatching.length > 0 ? (
              <section id="continue" className="space-y-5">
                <SectionHeader
                  eyebrow="Reprise"
                  title="Continuer la lecture"
                  detail="Vos lectures en cours synchronisees sur le web."
                />
                <div className="grid gap-4 lg:grid-cols-3">
                  {continueWatching.slice(0, 3).map((item) => (
                    <ContinueCard key={`${item.playable_type}:${item.playable_id}`} item={item} />
                  ))}
                </div>
              </section>
            ) : null}

            {watchlist.length > 0 ? (
              <section id="watchlist" className="space-y-5">
                <SectionHeader
                  eyebrow="Bibliotheque"
                  title="Ma liste"
                  detail="Retrouvez les titres sauvegardes pour plus tard."
                  action={
                    <div className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300">
                      <Bookmark className="mr-2 h-4 w-4" />
                      {watchlist.length} enregistre(s)
                    </div>
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {watchlist.slice(0, 8).map((item) => (
                    <WatchlistCard key={`${item.playable_type}:${item.playable_id}`} item={item} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-5">
              <SectionHeader
                eyebrow="Films"
                title="Films"
                detail="Disponibles maintenant sur le web."
                action={
                  <div className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300">
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {movies.length} titre(s)
                  </div>
                }
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {movies.map((item) => (
                  <CatalogCard key={item.id} item={item} />
                ))}
              </div>
              {movies.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.02] p-6 text-sm text-slate-500">
                  Aucun film public ne correspond a ce filtre.
                </div>
              ) : null}
            </section>

            <section className="space-y-5">
              <SectionHeader
                eyebrow="Series"
                title="Series"
                detail="Disponibles dans le catalogue web."
                action={
                  <div className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300">
                    <Clapperboard className="mr-2 h-4 w-4" />
                    {series.length} serie(s)
                  </div>
                }
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {series.map((item) => (
                  <CatalogCard key={item.id} item={item} />
                ))}
              </div>
              {series.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.02] p-6 text-sm text-slate-500">
                  Aucune serie publique ne correspond a ce filtre.
                </div>
              ) : null}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

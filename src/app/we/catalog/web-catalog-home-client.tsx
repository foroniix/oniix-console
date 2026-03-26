"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bookmark,
  Clapperboard,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  Tv2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useWebViewerAuth } from "@/components/we/web-viewer-auth";

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

const PHOTO_WALL = "/branding/photography/rural-broadband-data-center.jpg";
const PHOTO_FIELD = "/branding/photography/fiber-field-work.jpg";
const PHOTO_TOWER = "/branding/photography/communications-tower.jpg";

function getCatalogFallback(item: CatalogItem) {
  return item.title_type === "movie" ? PHOTO_FIELD : PHOTO_WALL;
}

function formatPercent(value: number | null | undefined) {
  if (!value || value <= 0) return null;
  return `${value}%`;
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

function ContinueCard({
  item,
}: {
  item: ReturnType<typeof useWebViewerAuth>["continueWatching"][number];
}) {
  const artwork = item.poster_url || PHOTO_FIELD;

  return (
    <Link
      href={`/we/catalog/${item.title_id}`}
      className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] transition hover:border-white/18 hover:bg-white/[0.05]"
    >
      <div className="relative aspect-[16/10] bg-black">
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.04]"
          style={{ backgroundImage: `url('${artwork}')` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.92))]" />
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
  const artwork = item.poster_url || PHOTO_TOWER;

  return (
    <Link
      href={`/we/catalog/${item.title_id}`}
      className="group overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03] transition hover:border-white/18 hover:bg-white/[0.05]"
    >
      <div className="relative aspect-[4/5] bg-black">
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.04]"
          style={{ backgroundImage: `url('${artwork}')` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.92))]" />
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
      className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] transition hover:border-white/18 hover:bg-white/[0.05]"
    >
      <div className="relative aspect-[16/10] bg-black">
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.04]"
          style={{ backgroundImage: `url('${artwork}')` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.9))]" />
        <div className="absolute left-4 top-4 inline-flex items-center rounded-full border border-white/10 bg-black/65 px-3 py-1 text-[11px] font-medium text-white">
          {item.title_type === "movie" ? "Film" : `${item.episode_count} episodes`}
        </div>
        {item.has_playback ? (
          <div className="absolute right-4 top-4 inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-medium text-black">
            Lecture
          </div>
        ) : null}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="line-clamp-2 text-lg font-semibold text-white">{item.title}</h3>
          <p className="mt-2 text-sm text-slate-300">
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

  return (
    <main className="min-h-[calc(100dvh-76px)] text-white">
      <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Oniix catalogue"
          title="Films, series et collections"
          detail="Un espace VOD web simple, dense et tourne vers la lecture."
          action={
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
              >
                <Tv2 className="mr-2 h-4 w-4" />
                Revenir a la TV
              </Link>
              <button
                type="button"
                onClick={() => void load(true)}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white transition hover:bg-white/[0.08]"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Actualiser
              </button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-3 rounded-[28px] border border-white/10 bg-white/[0.03] p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un film ou une serie"
              className="h-11 w-full rounded-full border border-white/10 bg-black/50 pl-10 pr-4 text-sm text-white outline-none transition focus:border-white/20"
            />
          </div>

          <div className="flex items-center gap-2">
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
                    ? "border-white/14 bg-white text-black"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/10 p-5 text-sm text-red-100">{error}</div>
        ) : (
          <>
            {featured ? (
              <Link
                href={`/we/catalog/${featured.id}`}
                className="group relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(120deg,#0a0a0a,#050505)] p-7"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30 transition duration-700 group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url('${featured.backdrop_url || featured.poster_url || getCatalogFallback(featured)}')` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,3,0.95),rgba(3,3,3,0.7),rgba(3,3,3,0.95))]" />
                <div className="relative grid gap-5 lg:grid-cols-[1fr_14rem]">
                  <div className="max-w-3xl">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      {featured.title_type === "movie" ? "Film" : "Serie"}
                    </p>
                    <h1 className="mt-3 font-[var(--font-we-display)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                      {featured.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                      {featured.short_synopsis || featured.long_synopsis || "Disponible en lecture web."}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="rounded-full border border-white/10 px-3 py-1">{featured.release_year || "--"}</span>
                      {featured.maturity_rating ? (
                        <span className="rounded-full border border-white/10 px-3 py-1">{featured.maturity_rating}</span>
                      ) : null}
                      {featured.original_language ? (
                        <span className="rounded-full border border-white/10 px-3 py-1">{featured.original_language}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Titres</p>
                      <p className="mt-3 text-3xl font-semibold text-white">{filteredItems.length}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Lecture</p>
                      <p className="mt-3 text-3xl font-semibold text-white">
                        {filteredItems.filter((item) => item.has_playback).length}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ) : null}

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
                    <div className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300">
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
                title="Selection cinema"
                detail="Films disponibles sur le portail public."
                action={
                  <div className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300">
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
                title="Collections episodiques"
                detail="Series et saisons disponibles dans le catalogue web."
                action={
                  <div className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300">
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

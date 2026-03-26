"use client";

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

function formatPercent(value: number | null | undefined) {
  if (!value || value <= 0) return null;
  return `${value}%`;
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

  const featured = filteredItems[0] ?? null;

  return (
    <main className="min-h-[calc(100dvh-73px)] bg-[#030303] text-white">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Catalogue web</p>
            <h1 className="mt-2 font-[var(--font-we-display)] text-3xl font-semibold tracking-tight text-white">
              Films et series
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/we"
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
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
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
            {continueWatching.length > 0 ? (
              <section id="continue" className="space-y-3">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-slate-400" />
                  <h2 className="font-[var(--font-we-display)] text-xl font-semibold text-white">Continuer</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {continueWatching.map((item) => (
                    <Link
                      key={`${item.playable_type}:${item.playable_id}`}
                      href={`/we/catalog/${item.title_id}`}
                      className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <div className="relative aspect-[16/10] bg-black">
                        {item.poster_url ? (
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url('${item.poster_url}')` }}
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.82))]" />
                        {item.percent_complete ? (
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                            <div
                              className="h-full bg-white"
                              style={{ width: `${Math.min(100, Math.max(0, item.percent_complete))}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="p-5">
                        <p className="text-xs text-slate-500">
                          {item.parent_title ? `${item.parent_title} · ` : ""}
                          {item.season_number ? `Saison ${item.season_number} · ` : ""}
                          {item.episode_number ? `Episode ${item.episode_number}` : "Film"}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-3 text-sm text-slate-400">
                          Reprendre {formatPercent(item.percent_complete) ? `a ${formatPercent(item.percent_complete)}` : "la lecture"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {watchlist.length > 0 ? (
              <section id="watchlist" className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-slate-400" />
                  <h2 className="font-[var(--font-we-display)] text-xl font-semibold text-white">Ma liste</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {watchlist.slice(0, 8).map((item) => (
                    <Link
                      key={`${item.playable_type}:${item.playable_id}`}
                      href={`/we/catalog/${item.title_id}`}
                      className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <div className="relative aspect-[4/5] bg-black">
                        {item.poster_url ? (
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url('${item.poster_url}')` }}
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.88))]" />
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-slate-500">{item.title_type === "movie" ? "Film" : "Serie"}</p>
                        <h3 className="mt-1 line-clamp-2 text-base font-semibold text-white">
                          {item.parent_title ? `${item.parent_title} · ${item.title}` : item.title}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {featured ? (
              <Link
                href={`/we/catalog/${featured.id}`}
                className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(120deg,#0a0a0a,#050505)] p-6"
              >
                {featured.backdrop_url ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-25 transition duration-500 group-hover:scale-[1.02]"
                    style={{ backgroundImage: `url('${featured.backdrop_url}')` }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,3,0.94),rgba(3,3,3,0.68),rgba(3,3,3,0.92))]" />
                <div className="relative max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {featured.title_type === "movie" ? "Film" : "Serie"}
                  </p>
                  <h2 className="mt-3 font-[var(--font-we-display)] text-4xl font-semibold tracking-tight text-white">
                    {featured.title}
                  </h2>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-300">
                    {featured.short_synopsis || featured.long_synopsis || "Contenu disponible en lecture web."}
                  </p>
                </div>
              </Link>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/we/catalog/${item.id}`}
                  className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className="relative aspect-[16/10] bg-black">
                    {item.poster_url ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                        style={{ backgroundImage: `url('${item.poster_url}')` }}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.82))]" />
                    <div className="absolute left-4 top-4 inline-flex items-center rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-medium text-white">
                      {item.title_type === "movie" ? "Film" : `${item.episode_count} episodes`}
                    </div>
                    {item.has_playback ? (
                      <div className="absolute right-4 top-4 inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-medium text-black">
                        Lecture disponible
                      </div>
                    ) : null}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.release_year || "--"} {item.maturity_rating ? `· ${item.maturity_rating}` : ""}
                        </p>
                      </div>
                      <Clapperboard className="h-4 w-4 shrink-0 text-slate-500" />
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
                      {item.short_synopsis || item.long_synopsis || "Disponible en lecture web."}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {filteredItems.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.02] p-6 text-sm text-slate-500">
                Aucun contenu public ne correspond a ce filtre.
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

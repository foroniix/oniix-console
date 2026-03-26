"use client";

import HlsPlayer from "@/components/HlsPlayer";
import { useWebPlaybackAnalytics } from "@/components/we/use-web-playback-analytics";
import { useWebViewerAuth } from "@/components/we/web-viewer-auth";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Loader2,
  Play,
  RefreshCw,
  Tv2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SeasonRow = {
  id: string;
  season_number: number;
  title: string | null;
  synopsis: string | null;
  sort_order: number;
};

type EpisodeRow = {
  id: string;
  season_id: string | null;
  episode_number: number;
  title: string;
  synopsis: string | null;
  duration_sec: number | null;
  release_date: string | null;
  poster_url: string | null;
  thumbnail_url: string | null;
  has_playback: boolean;
  source_kind: "hls" | "dash" | "file" | null;
};

type TitleDetailResponse = {
  ok?: boolean;
  error?: string;
  title?: {
    id: string;
    title_type: "movie" | "series";
    title: string;
    original_title: string | null;
    short_synopsis: string | null;
    long_synopsis: string | null;
    release_year: number | null;
    maturity_rating: string | null;
    original_language: string | null;
    poster_url: string | null;
    backdrop_url: string | null;
    logo_url: string | null;
  };
  movie_source?: {
    source_kind: "hls" | "dash" | "file";
    duration_sec: number | null;
  } | null;
  seasons?: SeasonRow[];
  episodes?: EpisodeRow[];
};

type PlaybackResponse = {
  ok?: boolean;
  error?: string;
  playable_type?: "movie" | "episode";
  playable_id?: string;
  source_kind?: "hls" | "dash" | "file";
  playback_url?: string;
  duration_sec?: number | null;
};

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

function formatEpisodeLabel(episode: EpisodeRow) {
  return `Episode ${episode.episode_number}`;
}

export default function WebCatalogTitleClient({ titleId }: { titleId: string }) {
  const { user, openAuthDialog, toggleWatchlist, isInWatchlist, getProgress, saveProgress } =
    useWebViewerAuth();
  const [detail, setDetail] = useState<TitleDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackKind, setPlaybackKind] = useState<"hls" | "dash" | "file" | null>(null);
  const [resolvingPlayback, setResolvingPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [activePlayable, setActivePlayable] = useState<{ type: "movie" | "episode"; id: string } | null>(null);
  const [playbackStartAtSec, setPlaybackStartAtSec] = useState<number>(0);
  const [updatingWatchlist, setUpdatingWatchlist] = useState(false);
  const lastSavedRef = useRef<Record<string, number>>({});
  const { trackPlayback } = useWebPlaybackAnalytics({
    playableType: activePlayable?.type ?? null,
    playableId: activePlayable?.id ?? null,
    enabled: Boolean(activePlayable),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/web/catalog/${encodeURIComponent(titleId)}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as TitleDetailResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Impossible de charger ce contenu.");
      }

      setDetail(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger ce contenu.");
    } finally {
      setLoading(false);
    }
  }, [titleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolvePlayback = useCallback(
    async (playableType: "movie" | "episode", playableId: string) => {
      setResolvingPlayback(true);
      setPlaybackError("");

      try {
        const progress = getProgress(playableType, playableId);
        setPlaybackStartAtSec(progress?.completed ? 0 : progress?.progress_sec ?? 0);

        const response = await fetch("/api/web/catalog/playback-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playable_type: playableType,
            playable_id: playableId,
          }),
        });
        const payload = (await response.json().catch(() => null)) as PlaybackResponse | null;
        if (!response.ok || !payload?.ok || !payload.playback_url) {
          throw new Error(payload?.error || "Impossible de lancer la lecture.");
        }

        setActivePlayable({ type: playableType, id: playableId });
        setPlaybackKind(payload.source_kind ?? "file");
        setPlaybackUrl(payload.playback_url);
      } catch (err) {
        setPlaybackUrl(null);
        setPlaybackKind(null);
        setPlaybackError(err instanceof Error ? err.message : "Impossible de lancer la lecture.");
      } finally {
        setResolvingPlayback(false);
      }
    },
    [getProgress]
  );

  const groupedEpisodes = useMemo(() => {
    const seasons = detail?.seasons ?? [];
    const episodes = detail?.episodes ?? [];
    const grouped = seasons.map((season) => ({
      season,
      episodes: episodes.filter((episode) => episode.season_id === season.id),
    }));
    const unassigned = episodes.filter((episode) => !episode.season_id);
    if (unassigned.length > 0) {
      grouped.push({
        season: {
          id: "unassigned",
          season_number: 0,
          title: "Collection",
          synopsis: null,
          sort_order: 99999,
        },
        episodes: unassigned,
      });
    }
    return grouped;
  }, [detail?.episodes, detail?.seasons]);

  const title = detail?.title;
  const isSaved = title ? isInWatchlist(title.title_type, title.id) : false;
  const movieProgress = title?.title_type === "movie" ? getProgress("movie", title.id) : null;

  useEffect(() => {
    lastSavedRef.current = {};
  }, [activePlayable?.id, activePlayable?.type]);

  const handlePlaybackProgress = useCallback(
    (snapshot: { currentTime: number; duration: number | null; ended: boolean }) => {
      trackPlayback(snapshot);
      if (!activePlayable || !user) return;

      const progressSec = Math.max(0, Math.floor(snapshot.currentTime || 0));
      const durationSec = snapshot.duration ?? null;
      const completed =
        snapshot.ended || (durationSec ? progressSec >= Math.max(1, durationSec - 5) : false);
      const key = `${activePlayable.type}:${activePlayable.id}`;
      const lastPersisted = lastSavedRef.current[key] ?? 0;

      if (!completed && progressSec < 5) return;
      if (!completed && Math.abs(progressSec - lastPersisted) < 15) return;

      lastSavedRef.current[key] = progressSec;
      void saveProgress({
        playableType: activePlayable.type,
        playableId: activePlayable.id,
        progressSec,
        durationSec,
        completed,
      });
    },
    [activePlayable, saveProgress, trackPlayback, user]
  );

  const handleToggleWatchlist = useCallback(async () => {
    if (!title) return;
    setUpdatingWatchlist(true);
    try {
      await toggleWatchlist(title.title_type, title.id);
    } finally {
      setUpdatingWatchlist(false);
    }
  }, [title, toggleWatchlist]);

  return (
    <main className="min-h-[calc(100dvh-76px)] text-white">
      <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/we/catalog"
              className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au catalogue
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
            >
              <Tv2 className="mr-2 h-4 w-4" />
              TV
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {!user ? (
              <button
                type="button"
                onClick={() => openAuthDialog("login")}
                className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
              >
                Connexion
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white transition hover:bg-white/[0.08]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-[30px] border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        ) : error || !title ? (
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/10 p-5 text-sm text-red-100">
            {error || "Contenu introuvable."}
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(120deg,#090909,#050505)] p-7">
              {title.backdrop_url ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-28"
                  style={{ backgroundImage: `url('${title.backdrop_url}')` }}
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,3,0.96),rgba(3,3,3,0.72),rgba(3,3,3,0.94))]" />

              <div className="relative grid gap-6 xl:grid-cols-[240px_1fr_16rem]">
                <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black">
                  {title.poster_url ? (
                    <div
                      className="aspect-[2/3] bg-cover bg-center"
                      style={{ backgroundImage: `url('${title.poster_url}')` }}
                    />
                  ) : (
                    <div className="flex aspect-[2/3] items-center justify-center text-sm text-slate-500">
                      Aucune affiche
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between gap-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      {title.title_type === "movie" ? "Film" : "Serie"}
                    </p>
                    <h1 className="mt-3 font-[var(--font-we-display)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                      {title.title}
                    </h1>
                    {title.original_title && title.original_title !== title.title ? (
                      <p className="mt-2 text-sm text-slate-500">{title.original_title}</p>
                    ) : null}
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                      {title.long_synopsis || title.short_synopsis || "Disponible en lecture web."}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="rounded-full border border-white/10 px-3 py-1">{title.release_year || "--"}</span>
                      {title.maturity_rating ? (
                        <span className="rounded-full border border-white/10 px-3 py-1">{title.maturity_rating}</span>
                      ) : null}
                      {title.original_language ? (
                        <span className="rounded-full border border-white/10 px-3 py-1">{title.original_language}</span>
                      ) : null}
                      {movieProgress?.percent_complete ? (
                        <span className="rounded-full border border-white/10 px-3 py-1">
                          Progression {formatPercent(movieProgress.percent_complete)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {title.title_type === "movie" && detail.movie_source ? (
                      <button
                        type="button"
                        onClick={() => void resolvePlayback("movie", title.id)}
                        className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black transition hover:bg-slate-200"
                      >
                        <Play className="h-4 w-4" />
                        {movieProgress && movieProgress.progress_sec > 30 && !movieProgress.completed
                          ? "Reprendre le film"
                          : "Lire le film"}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      disabled={updatingWatchlist}
                      onClick={() => void handleToggleWatchlist()}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-5 text-sm text-slate-200 transition hover:bg-white/[0.05] disabled:opacity-60"
                    >
                      {updatingWatchlist ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSaved ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                      {isSaved ? "Dans ma liste" : "Ajouter a ma liste"}
                    </button>
                  </div>

                  {!user ? (
                    <p className="text-xs text-slate-500">
                      Connectez-vous pour synchroniser votre progression et votre liste.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Lecture</p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {title.title_type === "movie" ? (detail.movie_source ? "1" : "0") : detail.episodes?.length || 0}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {title.title_type === "movie" ? "source disponible" : "episode(s)"}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Duree</p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {formatDuration(detail.movie_source?.duration_sec ?? null) || "--"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">lecture estimee</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Etat</p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {title.title_type === "movie"
                        ? detail.movie_source
                          ? "Pret a lire"
                          : "Sans source"
                        : (detail.episodes?.length || 0) > 0
                          ? "Disponible"
                          : "A completer"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {playbackError ? (
              <div className="rounded-[24px] border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100">
                {playbackError}
              </div>
            ) : null}

            {playbackUrl ? (
              <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#050505]">
                <div className="aspect-video bg-black">
                  <HlsPlayer
                    streamId={activePlayable?.id || title.id}
                    src={playbackUrl}
                    sourceKind={playbackKind ?? undefined}
                    poster={title.backdrop_url || title.poster_url || undefined}
                    controls
                    autoPlay
                    muted={false}
                    startAtSec={playbackStartAtSec}
                    onPlaybackProgress={handlePlaybackProgress}
                    className="h-full w-full"
                  />
                </div>
              </div>
            ) : null}

            {resolvingPlayback ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                Resolution de la lecture en cours...
              </div>
            ) : null}

            {title.title_type === "series" ? (
              <section className="space-y-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Episodes</p>
                  <h2 className="mt-2 font-[var(--font-we-display)] text-2xl font-semibold text-white">
                    Saisons et episodes
                  </h2>
                </div>

                <div className="space-y-4">
                  {groupedEpisodes.map(({ season, episodes }) => (
                    <div key={season.id} className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {season.season_number > 0 ? `Saison ${season.season_number}` : "Collection"}
                            {season.title ? ` - ${season.title}` : ""}
                          </h3>
                          {season.synopsis ? <p className="mt-1 text-sm text-slate-400">{season.synopsis}</p> : null}
                        </div>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                          {episodes.length} episode(s)
                        </span>
                      </div>

                      <div className="mt-5 grid gap-4">
                        {episodes.map((episode) => {
                          const episodeProgress = getProgress("episode", episode.id);
                          return (
                            <div
                              key={episode.id}
                              className="grid gap-4 rounded-[24px] border border-white/10 bg-black/35 p-4 lg:grid-cols-[8rem_1fr_auto]"
                            >
                              <div className="overflow-hidden rounded-[18px] bg-black">
                                {episode.thumbnail_url || episode.poster_url ? (
                                  <div
                                    className="aspect-[16/10] bg-cover bg-center"
                                    style={{ backgroundImage: `url('${episode.thumbnail_url || episode.poster_url}')` }}
                                  />
                                ) : (
                                  <div className="flex aspect-[16/10] items-center justify-center text-xs text-slate-500">
                                    Episode
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm text-slate-500">{formatEpisodeLabel(episode)}</p>
                                <h4 className="mt-1 text-base font-semibold text-white">{episode.title}</h4>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                  {episode.synopsis || "Disponible en lecture web."}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
                                {episode.duration_sec ? (
                                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                                    {formatDuration(episode.duration_sec)}
                                  </span>
                                ) : null}
                                {episodeProgress?.percent_complete ? (
                                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                                    {formatPercent(episodeProgress.percent_complete)}
                                  </span>
                                ) : null}
                                {episode.has_playback ? (
                                  <button
                                    type="button"
                                    onClick={() => void resolvePlayback("episode", episode.id)}
                                    className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-black transition hover:bg-slate-200"
                                  >
                                    <Play className="h-4 w-4" />
                                    {episodeProgress && episodeProgress.progress_sec > 30 && !episodeProgress.completed
                                      ? "Reprendre"
                                      : "Lire"}
                                  </button>
                                ) : (
                                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-500">
                                    Lecture indisponible
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

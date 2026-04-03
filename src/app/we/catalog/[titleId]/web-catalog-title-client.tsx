"use client";

import HlsPlayer from "@/components/HlsPlayer";
import { useWebPlaybackAnalytics } from "@/components/we/use-web-playback-analytics";
import { useWebViewerAuth } from "@/components/we/web-viewer-auth";
import { WEB_MEDIA_FALLBACKS } from "@/features/web-viewer/media/media.constants";
import { MediaThumb } from "@/features/web-viewer/media/media-thumb";
import { pickPosterArtwork, pickTitleStageArtwork } from "@/features/web-viewer/media/media.utils";
import { Panel } from "@/features/web-viewer/ui/panel";
import { StatCard } from "@/features/web-viewer/ui/stat-card";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
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
  const episodeCount = detail?.episodes?.length || 0;
  const playableEpisodeCount = detail?.episodes?.filter((episode) => episode.has_playback).length || 0;
  const readableDuration = formatDuration(detail?.movie_source?.duration_sec ?? null) || "--";
  const firstPlayableEpisode = useMemo(
    () => (detail?.episodes ?? []).find((episode) => episode.has_playback) ?? null,
    [detail?.episodes]
  );
  const resumeEpisode = useMemo(() => {
    const episodes = detail?.episodes ?? [];
    return (
      episodes.find((episode) => {
        if (!episode.has_playback) return false;
        const progress = getProgress("episode", episode.id);
        return Boolean(progress && progress.progress_sec > 30 && !progress.completed);
      }) ?? firstPlayableEpisode
    );
  }, [detail?.episodes, firstPlayableEpisode, getProgress]);
  const activeEpisode = useMemo(() => {
    if (activePlayable?.type !== "episode") return null;
    return (detail?.episodes ?? []).find((episode) => episode.id === activePlayable.id) ?? null;
  }, [activePlayable, detail?.episodes]);
  const stageArtwork = pickTitleStageArtwork({
    episodeThumbnail: activeEpisode?.thumbnail_url,
    episodePoster: activeEpisode?.poster_url,
    titleBackdrop: title?.backdrop_url,
    titlePoster: title?.poster_url,
  });
  const stageSynopsis =
    activeEpisode?.synopsis || title?.long_synopsis || title?.short_synopsis || "Disponible en lecture web.";
  const stageTitle = activeEpisode?.title || title?.title || "Oniix";
  const stageProgress =
    activePlayable?.type === "episode" && activePlayable.id ? getProgress("episode", activePlayable.id) : movieProgress;
  const resumeEpisodeProgress = resumeEpisode ? getProgress("episode", resumeEpisode.id) : null;

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
      <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/we/catalog"
              className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au catalogue
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
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
                className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
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
            <section className="grid gap-6 xl:grid-cols-[1.32fr_0.9fr]">
              <section className="space-y-5">
                <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#05070b] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
                  <div className="relative aspect-video bg-black">
                    {playbackUrl ? (
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
                    ) : resolvingPlayback ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Resolution de la lecture en cours...
                      </div>
                    ) : (
                      <MediaThumb
                        src={stageArtwork}
                        fallbackSrc={WEB_MEDIA_FALLBACKS.hero}
                        alt={stageTitle}
                        className="h-full w-full"
                      />
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,12,0.18),rgba(2,6,12,0.06),rgba(2,6,12,0.92))]" />
                    <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                        {title.title_type === "movie" ? "Film" : "Serie"}
                      </div>
                      {activeEpisode ? (
                        <div className="inline-flex items-center rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300 backdrop-blur">
                          {formatEpisodeLabel(activeEpisode)}
                        </div>
                      ) : title.release_year ? (
                        <div className="inline-flex items-center rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300 backdrop-blur">
                          {title.release_year}
                        </div>
                      ) : null}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="max-w-3xl font-[var(--font-we-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                        {stageTitle}
                      </p>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{stageSynopsis}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-[var(--font-we-display)] text-xl font-semibold text-white">{title.title}</p>
                      <p className="text-sm text-slate-500">
                        {title.title_type === "movie"
                          ? readableDuration
                          : `${episodeCount} episode(s) - ${playableEpisodeCount} lisible(s)`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {title.title_type === "movie" && detail.movie_source ? (
                        <button
                          type="button"
                          onClick={() => void resolvePlayback("movie", title.id)}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                        >
                          <Play className="h-4 w-4" />
                          {movieProgress && movieProgress.progress_sec > 30 && !movieProgress.completed ? "Reprendre" : "Lire"}
                        </button>
                      ) : null}
                      {title.title_type === "series" && resumeEpisode ? (
                        <button
                          type="button"
                          onClick={() => void resolvePlayback("episode", resumeEpisode.id)}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                        >
                          <Play className="h-4 w-4" />
                          {resumeEpisodeProgress && resumeEpisodeProgress.progress_sec > 30 && !resumeEpisodeProgress.completed
                            ? "Reprendre l episode"
                            : "Lire la serie"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={updatingWatchlist}
                        onClick={() => void handleToggleWatchlist()}
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-60"
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
                  </div>
                </div>

                {playbackError ? (
                  <div className="rounded-[24px] border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100">
                    {playbackError}
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard
                    label={title.title_type === "movie" ? "Lecture" : "Episodes"}
                    value={
                      title.title_type === "movie"
                        ? detail.movie_source
                          ? "Pret"
                          : "Vide"
                        : String(episodeCount)
                    }
                    detail={title.title_type === "movie" ? "Source disponible" : "Publies sur le web"}
                  />
                  <StatCard
                    label={title.title_type === "movie" ? "Duree" : "Playback"}
                    value={title.title_type === "movie" ? readableDuration : String(playableEpisodeCount)}
                    detail={title.title_type === "movie" ? "Estimation de lecture" : "Episode(s) lisible(s)"}
                  />
                  <StatCard
                    label="Progression"
                    value={formatPercent(stageProgress?.percent_complete) || (stageProgress?.progress_sec ? "En cours" : "--")}
                    detail="Synchronisee si vous etes connecte"
                  />
                </div>

                <Panel>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Synopsis</p>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                    {title.long_synopsis || title.short_synopsis || "Contenu disponible en lecture web sur Oniix."}
                  </p>
                </Panel>
              </section>

              <aside className="space-y-5">
                <Panel>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Repere</p>
                  <h2 className="mt-2 font-[var(--font-we-display)] text-2xl font-semibold text-white">{title.title}</h2>
                  {title.original_title && title.original_title !== title.title ? (
                    <p className="mt-2 text-sm text-slate-500">{title.original_title}</p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {title.release_year ? (
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                        {title.release_year}
                      </span>
                    ) : null}
                    {title.maturity_rating ? (
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                        {title.maturity_rating}
                      </span>
                    ) : null}
                    {title.original_language ? (
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                        {title.original_language}
                      </span>
                    ) : null}
                    {isSaved ? (
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                        Dans ma liste
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-slate-400">
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Lecture active</p>
                      <p className="mt-1 text-white">
                        {activeEpisode ? `${formatEpisodeLabel(activeEpisode)} - ${activeEpisode.title}` : title.title_type === "movie" ? "Film" : "Aucune"}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Point de depart</p>
                      <p className="mt-1 text-white">{playbackStartAtSec}s</p>
                    </div>
                    {title.title_type === "series" && resumeEpisode ? (
                      <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Prochain episode</p>
                        <p className="mt-1 text-white">
                          {formatEpisodeLabel(resumeEpisode)} - {resumeEpisode.title}
                        </p>
                      </div>
                    ) : null}
                    {!user ? (
                      <div className="rounded-[18px] border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-400">
                        Connectez-vous pour synchroniser votre progression et votre liste entre les surfaces Oniix.
                      </div>
                    ) : null}
                  </div>
                </Panel>
              </aside>
            </section>

            {title.title_type === "series" ? (
              <section className="space-y-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Episodes</p>
                  <h2 className="mt-2 font-[var(--font-we-display)] text-2xl font-semibold text-white">
                    Saisons et episodes
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Choisissez une saison puis lancez un episode.</p>
                </div>

                <div className="space-y-4">
                  {groupedEpisodes.map(({ season, episodes }) => (
                    <Panel key={season.id} className="rounded-[32px]">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">
                            {season.season_number > 0 ? `Saison ${season.season_number}` : "Collection"}
                            {season.title ? ` - ${season.title}` : ""}
                          </h3>
                          {season.synopsis ? <p className="mt-2 text-sm leading-6 text-slate-400">{season.synopsis}</p> : null}
                        </div>
                        <span className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300">
                          {episodes.length} episode(s)
                        </span>
                      </div>

                      <div className="mt-5 grid gap-4">
                        {episodes.map((episode) => {
                          const episodeProgress = getProgress("episode", episode.id);
                          return (
                            <div
                              key={episode.id}
                              className="grid gap-4 rounded-[26px] border border-white/10 bg-black/20 p-4 lg:grid-cols-[9rem_1fr_auto]"
                            >
                              <MediaThumb
                                src={pickPosterArtwork(episode.thumbnail_url, episode.poster_url)}
                                fallbackSrc={WEB_MEDIA_FALLBACKS.poster}
                                alt={episode.title}
                                className="aspect-[16/10] rounded-[18px] bg-black"
                                fallbackClassName="flex items-center justify-center text-xs text-slate-500"
                                fallback="Episode"
                              />

                              <div className="min-w-0">
                                <p className="text-sm text-slate-500">{formatEpisodeLabel(episode)}</p>
                                <h4 className="mt-1 text-base font-semibold text-white">{episode.title}</h4>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                  {episode.synopsis || "Disponible en lecture web."}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
                                {episode.duration_sec ? (
                                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
                                    {formatDuration(episode.duration_sec)}
                                  </span>
                                ) : null}
                                {episodeProgress?.percent_complete ? (
                                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
                                    {formatPercent(episodeProgress.percent_complete)}
                                  </span>
                                ) : null}
                                {episode.has_playback ? (
                                  <button
                                    type="button"
                                    onClick={() => void resolvePlayback("episode", episode.id)}
                                    className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                                  >
                                    <Play className="h-4 w-4" />
                                    {episodeProgress && episodeProgress.progress_sec > 30 && !episodeProgress.completed
                                      ? "Reprendre"
                                      : "Lire"}
                                  </button>
                                ) : (
                                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-500">
                                    Lecture indisponible
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Panel>
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

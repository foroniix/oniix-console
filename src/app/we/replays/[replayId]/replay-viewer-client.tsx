"use client";

import HlsPlayer from "@/components/HlsPlayer";
import { useWebPlaybackAnalytics } from "@/components/we/use-web-playback-analytics";
import { useWebViewerAuth } from "@/components/we/web-viewer-auth";
import { WEB_MEDIA_FALLBACKS } from "@/features/web-viewer/media/media.constants";
import { MediaThumb } from "@/features/web-viewer/media/media-thumb";
import { pickReplayArtwork } from "@/features/web-viewer/media/media.utils";
import { Panel } from "@/features/web-viewer/ui/panel";
import { StatCard } from "@/features/web-viewer/ui/stat-card";
import {
  ArrowLeft,
  Clapperboard,
  Loader2,
  PlayCircle,
  RefreshCw,
  Tv2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ReplayDetail = {
  id: string;
  tenant_id: string;
  title: string;
  synopsis: string | null;
  poster: string | null;
  hls_url: string | null;
  duration_sec: number | null;
  available_from: string | null;
  available_to: string | null;
  channel: {
    id: string | null;
    name: string | null;
    logo: string | null;
  };
};

type ReplayDetailResponse = {
  ok?: boolean;
  error?: string;
  replay?: ReplayDetail;
  related_replays?: ReplayDetail[];
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

export default function ReplayViewerClient({ replayId }: { replayId: string }) {
  const { user, openAuthDialog, getProgress, saveProgress } = useWebViewerAuth();
  const [replay, setReplay] = useState<ReplayDetail | null>(null);
  const [relatedReplays, setRelatedReplays] = useState<ReplayDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastSavedRef = useRef<number>(0);
  const { trackPlayback } = useWebPlaybackAnalytics({
    playableType: replay ? "replay" : null,
    playableId: replay?.id ?? null,
    enabled: Boolean(replay),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/web/replays/${encodeURIComponent(replayId)}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as ReplayDetailResponse | null;
      if (!response.ok || !payload?.ok || !payload.replay) {
        throw new Error(payload?.error || "Impossible de charger ce replay.");
      }

      setReplay(payload.replay);
      setRelatedReplays(Array.isArray(payload.related_replays) ? payload.related_replays : []);
    } catch (err) {
      setReplay(null);
      setRelatedReplays([]);
      setError(err instanceof Error ? err.message : "Impossible de charger ce replay.");
    } finally {
      setLoading(false);
    }
  }, [replayId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    lastSavedRef.current = 0;
  }, [replayId]);

  const progress = replay ? getProgress("replay", replay.id) : null;
  const startAtSec = progress?.completed ? 0 : progress?.progress_sec ?? 0;

  const handlePlaybackProgress = useCallback(
    (snapshot: { currentTime: number; duration: number | null; ended: boolean }) => {
      trackPlayback(snapshot);
      if (!replay || !user) return;

      const progressSec = Math.max(0, Math.floor(snapshot.currentTime || 0));
      const durationSec = snapshot.duration ?? replay.duration_sec ?? null;
      const completed =
        snapshot.ended || (durationSec ? progressSec >= Math.max(1, durationSec - 5) : false);

      if (!completed && progressSec < 5) return;
      if (!completed && Math.abs(progressSec - lastSavedRef.current) < 15) return;

      lastSavedRef.current = progressSec;
      void saveProgress({
        playableType: "replay",
        playableId: replay.id,
        progressSec,
        durationSec,
        completed,
      });
    },
    [replay, saveProgress, trackPlayback, user]
  );

  const headline = useMemo(() => {
    if (!replay) return null;
    return replay.channel.name ? `${replay.channel.name} - Replay` : "Replay";
  }, [replay]);

  return (
    <main className="min-h-[calc(100dvh-76px)] text-white">
      <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour TV
            </Link>
            <Link
              href="/we/catalog"
              className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Tv2 className="mr-2 h-4 w-4" />
              Catalogue
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
          <div className="flex min-h-[42vh] items-center justify-center rounded-[30px] border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        ) : error || !replay ? (
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/10 p-5 text-sm text-red-100">
            {error || "Replay introuvable."}
          </div>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.32fr_0.9fr]">
              <section className="space-y-5">
                <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#05070b] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
                  <div className="relative aspect-video bg-black">
                    {replay.hls_url ? (
                      <HlsPlayer
                        streamId={replay.id}
                        src={replay.hls_url}
                        poster={replay.poster || undefined}
                        controls
                        autoPlay
                        muted={false}
                        startAtSec={startAtSec}
                        onPlaybackProgress={handlePlaybackProgress}
                        className="h-full w-full"
                      />
                    ) : (
                      <MediaThumb
                        src={pickReplayArtwork(replay.poster)}
                        fallbackSrc={WEB_MEDIA_FALLBACKS.hero}
                        alt={replay.title}
                        className="h-full w-full"
                      />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,12,0.18),rgba(2,6,12,0.06),rgba(2,6,12,0.92))]" />
                    <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                        <Clapperboard className="h-3.5 w-3.5 text-sky-300" />
                        Replay
                      </div>
                      {replay.channel.name ? (
                        <div className="inline-flex items-center rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300 backdrop-blur">
                          {replay.channel.name}
                        </div>
                      ) : null}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="max-w-3xl font-[var(--font-we-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                        {replay.title}
                      </p>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                        {replay.synopsis || headline || "Replay disponible."}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-[var(--font-we-display)] text-xl font-semibold text-white">{replay.title}</p>
                      <p className="text-sm text-slate-500">
                        {replay.channel.name || "Replay"} {replay.duration_sec ? ` - ${formatDuration(replay.duration_sec)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
                        Reprise a {startAtSec}s
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
                        {progress?.completed ? "Termine" : progress?.progress_sec ? "En cours" : "Nouveau"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard
                    label="Chaine"
                    value={replay.channel.name || "--"}
                    detail="Canal source"
                  />
                  <StatCard
                    label="Duree"
                    value={formatDuration(replay.duration_sec) || "--"}
                    detail="Temps de visionnage"
                  />
                  <StatCard
                    label="Progression"
                    value={formatPercent(progress?.percent_complete) || (progress?.progress_sec ? "En cours" : "--")}
                    detail="Synchronisee si vous etes connecte"
                  />
                </div>

                <Panel>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Synopsis</p>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                    {replay.synopsis || "Ce replay est disponible en lecture web depuis le portail Oniix."}
                  </p>
                </Panel>
              </section>

              <aside className="space-y-5">
                <Panel>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Repere</p>
                  <h2 className="mt-2 font-[var(--font-we-display)] text-2xl font-semibold text-white">
                    Session replay
                  </h2>
                  <div className="mt-5 space-y-3 text-sm text-slate-400">
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Canal</p>
                      <p className="mt-1 text-white">{replay.channel.name || "--"}</p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Disponible depuis</p>
                      <p className="mt-1 text-white">{replay.available_from || "--"}</p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Point de reprise</p>
                      <p className="mt-1 text-white">{startAtSec}s</p>
                    </div>
                    {!user ? (
                      <div className="rounded-[18px] border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-400">
                        Connectez-vous pour reprendre vos replays sur tous vos ecrans.
                      </div>
                    ) : null}
                  </div>
                </Panel>

                {relatedReplays.length > 0 ? (
                  <Panel>
                    <div className="mb-4 flex items-center gap-2">
                      <Clapperboard className="h-4 w-4 text-slate-400" />
                      <p className="text-sm font-semibold text-white">Replays lies</p>
                    </div>
                    <div className="space-y-3">
                      {relatedReplays.map((item) => (
                        <Link
                          key={item.id}
                          href={`/we/replays/${item.id}`}
                          className="flex items-start gap-3 rounded-[18px] border border-white/10 bg-black/20 p-3 transition hover:border-white/20 hover:bg-black/35"
                        >
                          <MediaThumb
                            src={pickReplayArtwork(item.poster)}
                            fallbackSrc={WEB_MEDIA_FALLBACKS.replay}
                            alt={item.title}
                            className="h-16 w-24 shrink-0 rounded-[12px]"
                            fallbackClassName="flex items-center justify-center text-xs text-slate-500"
                            fallback="Replay"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium text-white">{item.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.channel.name || "Replay"} {item.duration_sec ? ` - ${formatDuration(item.duration_sec)}` : ""}
                            </p>
                          </div>
                          <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                        </Link>
                      ))}
                    </div>
                  </Panel>
                ) : null}

                <Panel>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Parcours</p>
                  <div className="mt-4 space-y-3">
                    <Link
                      href="/"
                      className="flex items-center justify-between rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 transition hover:border-white/18 hover:text-white"
                    >
                      Retour au direct
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/we/catalog"
                      className="flex items-center justify-between rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 transition hover:border-white/18 hover:text-white"
                    >
                      Explorer le catalogue
                      <Tv2 className="h-4 w-4" />
                    </Link>
                  </div>
                </Panel>
              </aside>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

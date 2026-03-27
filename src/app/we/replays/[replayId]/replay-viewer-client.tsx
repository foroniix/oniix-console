"use client";

import HlsPlayer from "@/components/HlsPlayer";
import { useWebPlaybackAnalytics } from "@/components/we/use-web-playback-analytics";
import { useWebViewerAuth } from "@/components/we/web-viewer-auth";
import {
  ArrowLeft,
  Clapperboard,
  Loader2,
  PlayCircle,
  RefreshCw,
  Sparkles,
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

const PHOTO_WALL = "/branding/photography/rural-broadband-data-center.jpg";

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

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
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
            <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(135deg,rgba(7,12,20,0.96),rgba(3,5,9,0.98))] p-7 shadow-[0_40px_120px_rgba(0,0,0,0.42)]">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-24"
                  style={{ backgroundImage: `url('${replay.poster || PHOTO_WALL}')` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,9,0.98),rgba(3,5,9,0.78),rgba(3,5,9,0.96))]" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

                <div className="relative flex h-full flex-col justify-between gap-8">
                  <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                      <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                      {headline}
                    </div>
                    <div>
                      <h1 className="max-w-3xl font-[var(--font-we-display)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        {replay.title}
                      </h1>
                      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                        {replay.synopsis || "Replay disponible en lecture web."}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard
                      label="Chaine"
                      value={replay.channel.name || "--"}
                      detail="Canal source du replay"
                    />
                    <StatCard
                      label="Duree"
                      value={formatDuration(replay.duration_sec) || "--"}
                      detail="Estimation de visionnage"
                    />
                    <StatCard
                      label="Progression"
                      value={formatPercent(progress?.percent_complete) || (progress?.progress_sec ? "En cours" : "--")}
                      detail="Suivi de lecture synchronise"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Lecture</p>
                <h2 className="mt-2 font-[var(--font-we-display)] text-2xl font-semibold text-white">
                  Session replay
                </h2>
                <div className="mt-5 space-y-3 text-sm text-slate-400">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Canal</p>
                    <p className="mt-1 text-white">{replay.channel.name || "--"}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Point de reprise</p>
                    <p className="mt-1 text-white">{startAtSec}s</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Etat</p>
                    <p className="mt-1 text-white">{progress?.completed ? "Termine" : progress?.progress_sec ? "En cours" : "Nouveau"}</p>
                  </div>
                  {!user ? (
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-400">
                      Connectez-vous pour synchroniser votre progression et reprendre vos replays sur tous vos ecrans.
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.32fr_0.9fr]">
              <section className="space-y-4">
                <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#05070b] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
                  <div className="aspect-video bg-black">
                    <HlsPlayer
                      streamId={replay.id}
                      src={replay.hls_url || ""}
                      poster={replay.poster || undefined}
                      controls
                      autoPlay
                      muted={false}
                      startAtSec={startAtSec}
                      onPlaybackProgress={handlePlaybackProgress}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              </section>

              <aside className="space-y-5">
                {relatedReplays.length > 0 ? (
                  <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Clapperboard className="h-4 w-4 text-slate-400" />
                      <p className="text-sm font-semibold text-white">Replays lies</p>
                    </div>
                    <div className="space-y-3">
                      {relatedReplays.map((item) => (
                        <Link
                          key={item.id}
                          href={`/we/replays/${item.id}`}
                          className="flex items-start justify-between gap-3 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 transition hover:border-white/20 hover:bg-black/35"
                        >
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-medium text-white">{item.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.channel.name || "Replay"} {item.duration_sec ? ` - ${formatDuration(item.duration_sec)}` : ""}
                            </p>
                          </div>
                          <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5">
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
                </div>
              </aside>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

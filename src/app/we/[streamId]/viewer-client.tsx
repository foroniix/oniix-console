"use client";

import HlsPlayer from "@/components/HlsPlayer";
import { ChannelLogoBadge } from "@/components/we/channel-logo-badge";
import { useWebPlaybackAnalytics } from "@/components/we/use-web-playback-analytics";
import { useWebViewerAuth } from "@/components/we/web-viewer-auth";
import { WEB_MEDIA_FALLBACKS } from "@/features/web-viewer/media/media.constants";
import { MediaThumb } from "@/features/web-viewer/media/media-thumb";
import { pickLiveArtwork, pickReplayArtwork } from "@/features/web-viewer/media/media.utils";
import { Panel } from "@/features/web-viewer/ui/panel";
import { StatCard } from "@/features/web-viewer/ui/stat-card";
import { useStreamHeartbeat } from "@/lib/useStreamHeartbeat";
import {
  ArrowLeft,
  CalendarClock,
  CircleAlert,
  Clapperboard,
  Loader2,
  Radio,
  RefreshCw,
  Tv2,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type WebPlaybackResponse = {
  ok?: boolean;
  error?: string;
  tenant_id?: string;
  channel_id?: string;
  stream_id?: string | null;
  session_id?: string;
  playback_url?: string;
  runtime_token?: string;
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

function normalizeLiveCategory(channel: GridChannel["channel"] | null | undefined) {
  const raw = `${channel?.category ?? ""} ${channel?.name ?? ""}`.trim().toLowerCase();
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
  const source = (channel?.category ?? "").trim();
  if (!source) return "General";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export default function ViewerClient({ streamId }: { streamId: string }) {
  const { user, getProgress, saveProgress } = useWebViewerAuth();
  const [grid, setGrid] = useState<GridChannel[]>([]);
  const [replays, setReplays] = useState<ReplayItem[]>([]);
  const [activeStreamId, setActiveStreamId] = useState(streamId);
  const [activeReplayId, setActiveReplayId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [runtimeToken, setRuntimeToken] = useState<string | null>(null);
  const [livePlaybackUrl, setLivePlaybackUrl] = useState<string | null>(null);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingPlayback, setResolvingPlayback] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [tab, setTab] = useState<"live" | "grid" | "replays">("live");
  const lastReplaySaveRef = useRef<Record<string, number>>({});

  const loadPortal = useCallback(
    async (soft = false) => {
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/web/live?includeReplays=1", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as LivePortalResponse | null;
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Impossible de charger la TV web.");
        }

        const lanes = Array.isArray(payload.grid) ? payload.grid : [];
        const replayRows = Array.isArray(payload.replays) ? payload.replays : [];
        setGrid(lanes);
        setReplays(replayRows);

        const stillExists = lanes.some((lane) => lane.live_stream?.id === activeStreamId);
        if (!stillExists) {
          const fallbackStreamId = lanes.find((lane) => lane.live_stream?.id)?.live_stream?.id ?? null;
          if (fallbackStreamId) {
            setActiveStreamId(fallbackStreamId);
            setLiveSessionId(null);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger la TV web.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeStreamId]
  );

  const resolvePlayback = useCallback(async (nextStreamId: string, existingSessionId?: string | null) => {
    setResolvingPlayback(true);
    setError("");

    try {
      const response = await fetch("/api/web/live/playback-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stream_id: nextStreamId,
          session_id: existingSessionId ?? undefined,
        }),
      });
      const payload = (await response.json().catch(() => null)) as WebPlaybackResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Impossible de resoudre la lecture web.");
      }

      setTenantId(payload.tenant_id ?? null);
      setRuntimeToken(payload.runtime_token ?? null);
      setLivePlaybackUrl(payload.playback_url ?? null);
      setLiveSessionId(payload.session_id ?? null);
    } catch (err) {
      setLivePlaybackUrl(null);
      setRuntimeToken(null);
      setTenantId(null);
      setLiveSessionId(null);
      setError(err instanceof Error ? err.message : "Impossible de resoudre la lecture web.");
    } finally {
      setResolvingPlayback(false);
    }
  }, []);

  useEffect(() => {
    void loadPortal(false);
    const timer = setInterval(() => void loadPortal(true), 45_000);
    return () => clearInterval(timer);
  }, [loadPortal]);

  useEffect(() => {
    if (!activeStreamId) return;
    void resolvePlayback(activeStreamId, null);
  }, [activeStreamId, resolvePlayback]);

  const activeLane = useMemo(
    () => grid.find((lane) => lane.live_stream?.id === activeStreamId) ?? null,
    [activeStreamId, grid]
  );

  const activeReplay = useMemo(
    () => replays.find((row) => row.id === activeReplayId) ?? null,
    [activeReplayId, replays]
  );

  const { trackPlayback } = useWebPlaybackAnalytics({
    playableType: activeReplay ? "replay" : null,
    playableId: activeReplay?.id ?? null,
    enabled: Boolean(activeReplay),
  });

  const activeReplayProgress = activeReplay ? getProgress("replay", activeReplay.id) : null;

  const activeReplaysForChannel = useMemo(() => {
    const channelId = activeLane?.channel.id ?? null;
    if (!channelId) return replays;
    return replays.filter((row) => row.channel.id === channelId);
  }, [activeLane?.channel.id, replays]);

  const playbackSrc = activeReplay?.hls_url ?? livePlaybackUrl;
  const playbackPoster =
    activeReplay?.poster || activeLane?.live_stream?.poster || activeLane?.now?.poster || undefined;
  const heartbeatStreamId = activeReplay ? null : activeStreamId;
  const playbackStartAtSec = activeReplay
    ? activeReplayProgress?.completed
      ? 0
      : activeReplayProgress?.progress_sec ?? 0
    : null;

  useStreamHeartbeat(heartbeatStreamId, {
    ingestToken: runtimeToken,
    tenantId,
    intervalSec: 15,
  });

  useEffect(() => {
    lastReplaySaveRef.current = {};
  }, [activeReplayId]);

  const handleReplayProgress = useCallback(
    (snapshot: { currentTime: number; duration: number | null; ended: boolean }) => {
      trackPlayback(snapshot);
      if (!activeReplay || !user) return;

      const progressSec = Math.max(0, Math.floor(snapshot.currentTime || 0));
      const durationSec = snapshot.duration ?? activeReplay.duration_sec ?? null;
      const completed =
        snapshot.ended || (durationSec ? progressSec >= Math.max(1, durationSec - 5) : false);
      const key = activeReplay.id;
      const lastPersisted = lastReplaySaveRef.current[key] ?? 0;

      if (!completed && progressSec < 5) return;
      if (!completed && Math.abs(progressSec - lastPersisted) < 15) return;

      lastReplaySaveRef.current[key] = progressSec;
      void saveProgress({
        playableType: "replay",
        playableId: activeReplay.id,
        progressSec,
        durationSec,
        completed,
      });
    },
    [activeReplay, saveProgress, trackPlayback, user]
  );

  return (
    <main className="min-h-[calc(100dvh-76px)] text-white">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              TV
            </Link>
            <div className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white">
              {activeReplay ? <Clapperboard className="h-4 w-4 text-sky-300" /> : <Radio className="h-4 w-4 text-red-400" />}
              {activeReplay ? "Replay" : "En direct"}
            </div>
            {activeLane?.channel ? (
              <div className="hidden h-11 items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 lg:inline-flex">
                <ChannelLogoBadge name={activeLane.channel.name} logoUrl={activeLane.channel.logo} size="sm" />
                <span className="max-w-[14rem] truncate text-sm text-white">{activeLane.channel.name}</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/we/catalog"
              className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Tv2 className="mr-2 h-4 w-4" />
              Catalogue
            </Link>
            <button
              type="button"
              onClick={() => {
                void loadPortal(true);
                if (activeStreamId) void resolvePlayback(activeStreamId, liveSessionId);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white transition hover:bg-white/[0.08]"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing || resolvingPlayback ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[42vh] items-center justify-center rounded-[30px] border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="flex items-center gap-2 font-medium">
              <CircleAlert className="h-4 w-4" />
              Impossible de charger le viewer web
            </div>
            <p className="mt-2 text-xs text-red-200/80">{error}</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.34fr_0.92fr]">
            <section className="space-y-5">
              <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#05070b] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
                <div className="relative aspect-video bg-black">
                  {playbackSrc ? (
                    <HlsPlayer
                      streamId={heartbeatStreamId || activeStreamId}
                      src={playbackSrc}
                      poster={playbackPoster}
                      muted={muted}
                      controls
                      autoPlay
                      className="h-full w-full"
                      startAtSec={playbackStartAtSec}
                      onPlaybackProgress={activeReplay ? handleReplayProgress : undefined}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Aucune source lisible n&apos;est disponible pour ce contenu.
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,12,0.18),rgba(2,6,12,0.05),rgba(2,6,12,0.92))]" />
                  <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                      {activeReplay ? <Clapperboard className="h-3.5 w-3.5 text-sky-300" /> : <Radio className="h-3.5 w-3.5 text-red-400" />}
                      {activeReplay ? "Replay" : "Direct"}
                    </div>
                    {activeLane?.channel ? (
                      <div className="inline-flex items-center rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300 backdrop-blur">
                        {normalizeLiveCategory(activeLane.channel)}
                      </div>
                    ) : null}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-5">
                    {!activeReplay && activeLane?.channel ? (
                      <div className="mb-4 flex items-center gap-3">
                        <ChannelLogoBadge name={activeLane.channel.name} logoUrl={activeLane.channel.logo} size="md" />
                        <div>
                          <p className="text-sm text-slate-200">{activeLane.channel.name}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            {normalizeLiveCategory(activeLane.channel)}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <p className="max-w-3xl font-[var(--font-we-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                      {activeReplay?.title || activeLane?.live_stream?.title || activeLane?.channel.name || "Direct"}
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                      {activeReplay
                        ? activeReplay.synopsis || activeReplay.channel.name || "Replay disponible."
                        : activeLane?.now?.title || "Lecture live disponible maintenant."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-[var(--font-we-display)] text-xl font-semibold text-white">
                      {activeReplay?.title || activeLane?.live_stream?.title || activeLane?.channel.name || "Direct"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {activeReplay ? "Replay" : "Direct"}
                      {activeLane?.channel.name ? ` - ${activeLane.channel.name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="hidden rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 md:inline-flex">
                      {activeLane?.next?.title
                        ? `${formatClock(activeLane.next.starts_at)} - ${activeLane.next.title}`
                        : activeReplay
                          ? activeReplay.channel.name || "Replay"
                          : "Suite a venir"}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMuted((prev) => !prev)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-200 transition hover:bg-white/[0.08]"
                    >
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      {muted ? "Activer le son" : "Couper le son"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                  label="Mode"
                  value={activeReplay ? "Replay" : "Live"}
                  detail={activeReplay ? "Lecture a la demande" : "Flux actif"}
                />
                <StatCard
                  label="Replays"
                  value={String(activeReplaysForChannel.length)}
                  detail="Lies a la chaine active"
                />
                <StatCard
                  label="Suite"
                  value={activeLane?.next?.title ? formatClock(activeLane.next.starts_at) : "--:--"}
                  detail={activeLane?.next?.title || "A venir"}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-white/10 bg-white/[0.03] p-2">
                <button
                  type="button"
                  onClick={() => setTab("live")}
                  className={`h-11 rounded-2xl text-sm font-medium transition ${
                    tab === "live" ? "bg-white text-slate-950" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  Direct
                </button>
                <button
                  type="button"
                  onClick={() => setTab("grid")}
                  className={`h-11 rounded-2xl text-sm font-medium transition ${
                    tab === "grid" ? "bg-white text-slate-950" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  Grille
                </button>
                <button
                  type="button"
                  onClick={() => setTab("replays")}
                  className={`h-11 rounded-2xl text-sm font-medium transition ${
                    tab === "replays"
                      ? "bg-white text-slate-950"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  Replays
                </button>
              </div>

              {tab === "live" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {grid.map((lane) => {
                    const laneStreamId = lane.live_stream?.id ?? "";
                    const isActive = laneStreamId === activeStreamId && !activeReplayId;

                    return (
                      <button
                        type="button"
                        key={lane.channel.id}
                        disabled={!laneStreamId}
                        onClick={() => {
                          if (!laneStreamId) return;
                          setTab("live");
                          setActiveReplayId(null);
                          setActiveStreamId(laneStreamId);
                          setLiveSessionId(null);
                        }}
                        className={`overflow-hidden rounded-[28px] border text-left transition ${
                          isActive
                            ? "border-white/18 bg-white/[0.08]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="relative aspect-[16/10] bg-black">
                          <MediaThumb
                            src={pickLiveArtwork(lane.live_stream?.poster, lane.now?.poster)}
                            fallbackSrc={WEB_MEDIA_FALLBACKS.live}
                            alt={lane.channel.name}
                            className="absolute inset-0"
                            imgClassName="transition duration-700 group-hover:scale-[1.04]"
                          />
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(2,6,12,0.92))]" />
                          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3 py-1 text-[11px] font-medium text-white">
                            <Radio className="h-3.5 w-3.5 text-red-400" />
                            {normalizeLiveCategory(lane.channel)}
                          </div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <div className="mb-3">
                              <ChannelLogoBadge name={lane.channel.name} logoUrl={lane.channel.logo} size="sm" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">{lane.channel.name}</h3>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
                              {lane.now?.title || lane.live_stream?.title || "Direct disponible"}
                            </p>
                          </div>
                        </div>
                        <div className="p-4 text-sm text-slate-400">
                          {lane.next?.title ? `${formatClock(lane.next.starts_at)} - ${lane.next.title}` : "Suite a venir"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {tab === "grid" ? (
                <Panel>
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
                    <CalendarClock className="h-4 w-4 text-slate-400" />
                    Grille de diffusion
                  </div>
                  <div className="space-y-3">
                    {(activeLane?.slots ?? []).slice(0, 12).map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-start justify-between gap-4 rounded-[22px] border border-white/10 bg-black/20 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{slot.title}</p>
                          {slot.notes ? <p className="mt-1 text-xs text-slate-500">{slot.notes}</p> : null}
                        </div>
                        <p className="shrink-0 text-xs text-slate-500">
                          {formatClock(slot.starts_at)} - {formatClock(slot.ends_at)}
                        </p>
                      </div>
                    ))}
                    {(!activeLane || activeLane.slots.length === 0) && (
                      <p className="rounded-[22px] border border-dashed border-white/12 px-4 py-5 text-center text-xs text-slate-500">
                        Aucune grille publiee pour cette chaine pour le moment.
                      </p>
                    )}
                  </div>
                </Panel>
              ) : null}

              {tab === "replays" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeReplaysForChannel.map((replay) => (
                    <button
                      key={replay.id}
                      type="button"
                      onClick={() => setActiveReplayId(replay.id)}
                      className={`overflow-hidden rounded-[28px] border text-left transition ${
                        activeReplayId === replay.id
                          ? "border-white/18 bg-white/[0.08]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="relative aspect-[16/10] bg-black">
                        <MediaThumb
                          src={pickReplayArtwork(replay.poster)}
                          fallbackSrc={WEB_MEDIA_FALLBACKS.replay}
                          alt={replay.title}
                          className="absolute inset-0"
                          imgClassName="transition duration-700 group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(2,6,12,0.92))]" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="line-clamp-2 text-lg font-semibold text-white">{replay.title}</h3>
                        </div>
                      </div>
                      <div className="p-4 text-sm text-slate-400">
                        {replay.channel.name || "Replay"} {replay.duration_sec ? ` - ${formatDuration(replay.duration_sec)}` : ""}
                      </div>
                    </button>
                  ))}
                  {activeReplaysForChannel.length === 0 && (
                    <p className="rounded-[22px] border border-dashed border-white/12 px-4 py-5 text-center text-xs text-slate-500 sm:col-span-2">
                      Aucun replay disponible pour cette chaine.
                    </p>
                  )}
                </div>
              ) : null}
            </section>

            <aside className="space-y-5">
              <Panel>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Maintenant</p>
                <h2 className="mt-2 font-[var(--font-we-display)] text-2xl font-semibold text-white">
                  {activeReplay ? activeReplay.channel.name || "Replay" : activeLane?.channel.name || "Selection active"}
                </h2>
                <div className="mt-5 space-y-3">
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">En cours</p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {activeReplay?.title || activeLane?.now?.title || activeLane?.live_stream?.title || "--"}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">A suivre</p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {activeLane?.next?.title || (activeReplay ? activeReplay.channel.name || "--" : "--")}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Categorie</p>
                    <p className="mt-1 text-sm font-medium text-white">{normalizeLiveCategory(activeLane?.channel)}</p>
                  </div>
                </div>
              </Panel>

              <Panel>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Selection rapide</p>
                <div className="mt-4 grid gap-2">
                  {grid.map((lane) => {
                    const laneStreamId = lane.live_stream?.id ?? "";
                    return (
                      <button
                        key={lane.channel.id}
                        type="button"
                        disabled={!laneStreamId}
                        onClick={() => {
                          if (!laneStreamId) return;
                          setTab("live");
                          setActiveReplayId(null);
                          setActiveStreamId(laneStreamId);
                          setLiveSessionId(null);
                        }}
                        className={`flex items-center justify-between rounded-[18px] border px-4 py-3 text-left text-sm transition ${
                          laneStreamId === activeStreamId && !activeReplayId
                            ? "border-white/18 bg-white/[0.08] text-white"
                            : "border-white/10 bg-black/20 text-slate-400 hover:border-white/18 hover:text-white"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <ChannelLogoBadge name={lane.channel.name} logoUrl={lane.channel.logo} size="sm" />
                          <span className="truncate">{lane.channel.name}</span>
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                          {normalizeLiveCategory(lane.channel)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Panel>

              <Panel>
                <div className="mb-4 flex items-center gap-2">
                  <Clapperboard className="h-4 w-4 text-slate-400" />
                  <p className="text-sm font-semibold text-white">Replays lies</p>
                </div>
                <div className="space-y-2">
                  {activeReplaysForChannel.slice(0, 5).map((replay) => (
                    <button
                      key={replay.id}
                      type="button"
                      onClick={() => {
                        setTab("replays");
                        setActiveReplayId(replay.id);
                      }}
                      className={`w-full rounded-[18px] border px-4 py-3 text-left text-sm transition ${
                        activeReplayId === replay.id
                          ? "border-white/18 bg-white/[0.08] text-white"
                          : "border-white/10 bg-black/20 text-slate-400 hover:border-white/18 hover:text-white"
                      }`}
                    >
                      <p className="line-clamp-2 font-medium">{replay.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {replay.duration_sec ? formatDuration(replay.duration_sec) : "Replay"}
                      </p>
                    </button>
                  ))}
                  {activeReplaysForChannel.length === 0 ? (
                    <p className="rounded-[18px] border border-dashed border-white/12 px-4 py-5 text-center text-xs text-slate-500">
                      Aucun replay lie a cette chaine.
                    </p>
                  ) : null}
                </div>
              </Panel>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

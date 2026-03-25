"use client";

import HlsPlayer from "@/components/HlsPlayer";
import { useStreamHeartbeat } from "@/lib/useStreamHeartbeat";
import {
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
import { useCallback, useEffect, useMemo, useState } from "react";

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

export default function ViewerClient({ streamId }: { streamId: string }) {
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

  const loadPortal = useCallback(async (soft = false) => {
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
  }, [activeStreamId]);

  const resolvePlayback = useCallback(
    async (nextStreamId: string, existingSessionId?: string | null) => {
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
          throw new Error(payload?.error || "Impossible de résoudre la lecture web.");
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
        setError(err instanceof Error ? err.message : "Impossible de résoudre la lecture web.");
      } finally {
        setResolvingPlayback(false);
      }
    },
    []
  );

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

  const activeReplaysForChannel = useMemo(() => {
    const channelId = activeLane?.channel.id ?? null;
    if (!channelId) return replays;
    return replays.filter((row) => row.channel.id === channelId);
  }, [activeLane?.channel.id, replays]);

  const playbackSrc = activeReplay?.hls_url ?? livePlaybackUrl;
  const playbackPoster =
    activeReplay?.poster || activeLane?.live_stream?.poster || activeLane?.now?.poster || undefined;
  const heartbeatStreamId = activeReplay ? null : activeStreamId;

  useStreamHeartbeat(heartbeatStreamId, {
    ingestToken: runtimeToken,
    tenantId,
    intervalSec: 15,
  });

  return (
    <main className="min-h-[calc(100dvh-73px)] overflow-x-hidden bg-[#030303] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-0 h-[360px] w-[360px] rounded-full bg-white/[0.04] blur-[130px]" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[360px] w-[360px] rounded-full bg-white/[0.03] blur-[150px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-white/[0.03] px-4 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white">
              <Tv2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-[var(--font-we-display)] text-base font-semibold">Visionnage desktop</p>
              <p className="text-xs text-slate-500">{activeLane?.channel.name || "Direct Oniix"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/we"
              className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
            >
              Retour TV
            </Link>
            <Link
              href="/we/catalog"
              className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
            >
              Catalogue
            </Link>
            <button
              type="button"
              onClick={() => {
                void loadPortal(true);
                if (activeStreamId) void resolvePlayback(activeStreamId, liveSessionId);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white transition hover:bg-white/[0.08]"
            >
              <RefreshCw className={`h-4 w-4 ${(refreshing || resolvingPlayback) ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[42vh] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03]">
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
          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
            <section className="space-y-4">
              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#050505]">
                <div className="aspect-video bg-black">
                  {playbackSrc ? (
                    <HlsPlayer
                      streamId={heartbeatStreamId || activeStreamId}
                      src={playbackSrc}
                      poster={playbackPoster}
                      muted={muted}
                      controls
                      autoPlay
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Aucune source lisible n&apos;est disponible pour ce contenu.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-[var(--font-we-display)] text-lg font-semibold text-white">
                      {activeReplay?.title || activeLane?.live_stream?.title || activeLane?.channel.name || "Direct"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {activeReplay ? "Replay" : "Direct"} {activeLane?.channel.name ? `· ${activeLane.channel.name}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMuted((prev) => !prev)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-slate-200 transition hover:bg-white/[0.05]"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    {muted ? "Activer le son" : "Couper le son"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-white/10 bg-white/[0.03] p-2">
                <button
                  type="button"
                  onClick={() => setTab("live")}
                  className={`h-10 rounded-2xl text-sm font-medium transition ${
                    tab === "live" ? "bg-white text-black" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  Direct
                </button>
                <button
                  type="button"
                  onClick={() => setTab("grid")}
                  className={`h-10 rounded-2xl text-sm font-medium transition ${
                    tab === "grid" ? "bg-white text-black" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  Grille
                </button>
                <button
                  type="button"
                  onClick={() => setTab("replays")}
                  className={`h-10 rounded-2xl text-sm font-medium transition ${
                    tab === "replays" ? "bg-white text-black" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  Replays
                </button>
              </div>

              {tab === "live" && (
                <div className="space-y-3">
                  {grid.map((lane) => {
                    const laneStreamId = lane.live_stream?.id ?? "";
                    const isActive = laneStreamId === activeStreamId;
                    return (
                      <button
                        type="button"
                        key={lane.channel.id}
                        disabled={!laneStreamId}
                        onClick={() => {
                          if (!laneStreamId) return;
                          setActiveReplayId(null);
                          setActiveStreamId(laneStreamId);
                          setLiveSessionId(null);
                        }}
                        className={`w-full rounded-[24px] border p-4 text-left transition ${
                          isActive
                            ? "border-white/18 bg-white/[0.08]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-white">{lane.channel.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {lane.now?.title ? `En cours : ${lane.now.title}` : "Aucun programme en cours"}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-medium text-red-200">
                            <Radio className="h-3 w-3" />
                            {lane.live_stream?.id ? "Direct" : "Hors antenne"}
                          </span>
                        </div>
                        {lane.next?.title ? (
                          <p className="mt-3 text-xs text-slate-400">
                            À suivre à {formatClock(lane.next.starts_at)} · {lane.next.title}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {tab === "grid" && (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                    <CalendarClock className="h-4 w-4 text-slate-400" />
                    Grille de diffusion
                  </div>
                  <div className="space-y-2">
                    {(activeLane?.slots ?? []).slice(0, 12).map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/50 px-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{slot.title}</p>
                          {slot.notes ? <p className="mt-0.5 text-xs text-slate-500">{slot.notes}</p> : null}
                        </div>
                        <p className="shrink-0 text-xs text-slate-500">
                          {formatClock(slot.starts_at)} - {formatClock(slot.ends_at)}
                        </p>
                      </div>
                    ))}
                    {(!activeLane || activeLane.slots.length === 0) && (
                      <p className="rounded-2xl border border-dashed border-white/12 px-3 py-4 text-center text-xs text-slate-500">
                        Aucune grille publiée pour cette chaîne pour le moment.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {tab === "replays" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeReplaysForChannel.map((replay) => (
                    <button
                      key={replay.id}
                      type="button"
                      onClick={() => setActiveReplayId(replay.id)}
                      className={`rounded-[24px] border bg-white/[0.03] p-4 text-left transition ${
                        activeReplayId === replay.id ? "border-white/18" : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <p className="line-clamp-2 text-sm font-medium text-white">{replay.title}</p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                        <Clapperboard className="h-3.5 w-3.5" />
                        <span>{replay.channel.name || "Replay"}</span>
                        {replay.duration_sec ? <span>· {formatDuration(replay.duration_sec)}</span> : null}
                      </div>
                    </button>
                  ))}
                  {activeReplaysForChannel.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-white/12 px-3 py-4 text-center text-xs text-slate-500 sm:col-span-2">
                      Aucun replay disponible pour cette chaîne.
                    </p>
                  )}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="font-[var(--font-we-display)] text-sm font-semibold text-white">Contexte éditorial</p>
                <div className="mt-3 space-y-2 text-xs text-slate-400">
                  <p>
                    Chaîne : <span className="text-white">{activeLane?.channel.name || "--"}</span>
                  </p>
                  <p>
                    En cours : <span className="text-white">{activeLane?.now?.title || "Aucun programme en cours"}</span>
                  </p>
                  <p>
                    À suivre : <span className="text-white">{activeLane?.next?.title || "--"}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-3 font-[var(--font-we-display)] text-sm font-semibold text-white">Sélection rapide</p>
                <div className="space-y-2">
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
                        className={`w-full rounded-2xl border px-3 py-2 text-left text-xs transition ${
                          laneStreamId === activeStreamId
                            ? "border-white/18 bg-white/[0.08] text-white"
                            : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {lane.channel.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

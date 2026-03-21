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
    name: string;
    logo: string | null;
  };
  live_stream?: {
    id: string;
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
  title: string;
  synopsis: string | null;
  poster: string | null;
  hls_url: string | null;
  duration_sec: number | null;
  available_from: string | null;
  available_to: string | null;
  channel: { id: string | null; name: string | null; logo: string | null };
};

type ProgramGridResponse = {
  ok?: boolean;
  tenant_id?: string;
  grid?: GridChannel[];
  replays?: ReplayItem[];
};

type PlaybackUrlResponse = {
  ok?: boolean;
  channel_id?: string;
  playback_url?: string;
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
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${Math.max(1, mins)}m`;
}

export default function ViewerClient({ streamId }: { streamId: string }) {
  const [ingestToken, setIngestToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [grid, setGrid] = useState<GridChannel[]>([]);
  const [replays, setReplays] = useState<ReplayItem[]>([]);
  const [livePlaybackUrl, setLivePlaybackUrl] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeReplayId, setActiveReplayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [tab, setTab] = useState<"live" | "grid" | "replays">("live");

  const boot = useCallback(
    async (soft = false) => {
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const tokenRes = await fetch("/api/mobile/ingest-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stream_id: streamId, ttl_sec: 900 }),
        });
        const tokenJson = await tokenRes.json().catch(() => null);
        if (!tokenRes.ok || !tokenJson?.ok) {
          throw new Error(tokenJson?.error || "Impossible d'initialiser l'acces de lecture.");
        }

        const token = String(tokenJson.token ?? "");
        const tenant = String(tokenJson.tenant_id ?? "");
        if (!token || !tenant) {
          throw new Error("Invalid ingest token response.");
        }

        const playbackRes = await fetch("/api/mobile/playback-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-oniix-token": token,
            "x-oniix-tenant": tenant,
          },
          body: JSON.stringify({ stream_id: streamId }),
        });
        const playbackJson = (await playbackRes.json().catch(() => null)) as PlaybackUrlResponse | null;
        if (!playbackRes.ok || !playbackJson?.ok) {
          throw new Error((playbackJson as { error?: string } | null)?.error || "Impossible de resoudre la lecture en direct.");
        }

        const channelId = String(playbackJson.channel_id ?? "").trim();
        const playbackUrl = String(playbackJson.playback_url ?? "").trim();
        if (!channelId || !playbackUrl) {
          throw new Error("Invalid playback response.");
        }

        const params = new URLSearchParams({
          hours: "24",
          includeReplays: "1",
          channelId,
        });
        const gridRes = await fetch(`/api/mobile/program-grid?${params.toString()}`, {
          headers: {
            "x-oniix-token": token,
            "x-oniix-tenant": tenant,
          },
          cache: "no-store",
        });
        const gridJson = (await gridRes.json().catch(() => null)) as ProgramGridResponse | null;
        if (!gridRes.ok || !gridJson?.ok) {
          throw new Error((gridJson as { error?: string } | null)?.error || "Impossible de charger le catalogue de lecture.");
        }

        const lanes = Array.isArray(gridJson.grid) ? gridJson.grid : [];
        const replayRows = Array.isArray(gridJson.replays) ? gridJson.replays : [];

        setIngestToken(token);
        setTenantId(tenant);
        setGrid(lanes);
        setReplays(replayRows);
        setLivePlaybackUrl(playbackUrl);

        setActiveChannelId((prev) => {
          if (prev && lanes.some((lane) => lane.channel.id === prev)) return prev;
          const exact = lanes.find((lane) => lane.live_stream?.id === streamId)?.channel.id ?? null;
          return exact || lanes[0]?.channel.id || channelId;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de charger la visionneuse.";
        setLivePlaybackUrl(null);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [streamId]
  );

  useEffect(() => {
    void boot(false);
    const t = setInterval(() => void boot(true), 45_000);
    return () => clearInterval(t);
  }, [boot]);

  const activeLane = useMemo(() => {
    if (!activeChannelId) return null;
    return grid.find((lane) => lane.channel.id === activeChannelId) ?? null;
  }, [activeChannelId, grid]);

  const activeReplay = useMemo(
    () => replays.find((row) => row.id === activeReplayId) ?? null,
    [activeReplayId, replays]
  );

  const activeReplaysForChannel = useMemo(() => {
    const channelId = activeLane?.channel.id ?? null;
    if (!channelId) return replays;
    return replays.filter((row) => row.channel.id === channelId);
  }, [activeLane?.channel.id, replays]);

  const liveSrc = livePlaybackUrl;
  const replaySrc = activeReplay?.hls_url ?? null;
  const playbackSrc = replaySrc || liveSrc;
  const playbackPoster = activeReplay?.poster || activeLane?.live_stream?.poster || activeLane?.now?.poster || undefined;
  const heartbeatStreamId = replaySrc ? null : streamId;

  useStreamHeartbeat(heartbeatStreamId, { ingestToken, tenantId, intervalSec: 15 });

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#081224] text-[#ecf3ff]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-[#00d39b]/14 blur-[130px]" />
        <div className="absolute top-[25%] right-[-140px] h-[420px] w-[420px] rounded-full bg-[#1f8bff]/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0c1a33]/70 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#102344] text-[#89b5ff]">
              <Tv2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-[var(--font-we-display)] text-sm font-semibold tracking-wide">ONIIX WEB LIVE</p>
              <p className="text-xs text-[#9bb0cb]">Flux {streamId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/we"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-white/15 px-3 text-xs text-[#bbcae0] transition hover:bg-white/5"
            >
              Changer de direct
            </Link>
            <button
              type="button"
              onClick={() => void boot(true)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#1f8bff] px-3 text-xs font-medium text-white transition hover:bg-[#1873d6]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-white/10 bg-[#0c1a33]/55">
            <Loader2 className="h-7 w-7 animate-spin text-[#7db1ff]" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#ff6e7a]/35 bg-[#3f1622]/55 p-4 text-sm text-[#ffc8ce]">
            <div className="flex items-center gap-2 font-medium">
              <CircleAlert className="h-4 w-4" />
              Impossible de charger la visionneuse
            </div>
            <p className="mt-2 text-xs text-[#f0b8c0]">{error}</p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
            <section className="space-y-4">
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#081933]">
                <div className="aspect-video bg-black">
                  {playbackSrc ? (
                    <HlsPlayer
                      streamId={heartbeatStreamId || streamId}
                      src={playbackSrc}
                      poster={playbackPoster}
                      muted={muted}
                      controls
                      autoPlay
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#8ea5c5]">
                      Aucune source lisible n&apos;est disponible pour cette chaine.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-3 py-3 sm:px-4">
                  <div className="min-w-0">
                    <p className="truncate font-[var(--font-we-display)] text-base font-semibold text-white">
                      {activeReplay?.title || activeLane?.live_stream?.title || activeLane?.channel.name || "Direct"}
                    </p>
                    <p className="text-xs text-[#9ab0cb]">
                      {activeReplay ? "Mode replay" : "Mode direct"} {activeLane?.channel.name ? `- ${activeLane.channel.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMuted((prev) => !prev)}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 text-xs text-[#c7d6ea] transition hover:bg-white/5"
                    >
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      {muted ? "Activer le son" : "Couper le son"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#0c1a33]/70 p-2">
                <button
                  type="button"
                  onClick={() => setTab("live")}
                  className={`h-10 rounded-xl text-sm font-medium transition ${
                    tab === "live" ? "bg-[#1f8bff] text-white" : "text-[#9cb3d0] hover:bg-white/5"
                  }`}
                >
                  Direct
                </button>
                <button
                  type="button"
                  onClick={() => setTab("grid")}
                  className={`h-10 rounded-xl text-sm font-medium transition ${
                    tab === "grid" ? "bg-[#1f8bff] text-white" : "text-[#9cb3d0] hover:bg-white/5"
                  }`}
                >
                  Grille
                </button>
                <button
                  type="button"
                  onClick={() => setTab("replays")}
                  className={`h-10 rounded-xl text-sm font-medium transition ${
                    tab === "replays" ? "bg-[#1f8bff] text-white" : "text-[#9cb3d0] hover:bg-white/5"
                  }`}
                >
                  Replays
                </button>
              </div>

              {tab === "live" && (
                <div className="space-y-3">
                  {grid.map((lane) => {
                    const isActive = lane.channel.id === activeChannelId;
                    return (
                      <button
                        type="button"
                        key={lane.channel.id}
                        onClick={() => {
                          setActiveReplayId(null);
                          setActiveChannelId(lane.channel.id);
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isActive
                            ? "border-[#4ea0ff] bg-[#12335e]"
                            : "border-white/10 bg-[#0d1d38]/70 hover:border-white/25"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-[var(--font-we-display)] text-base font-semibold text-white">
                              {lane.channel.name}
                            </p>
                            <p className="mt-1 text-xs text-[#9db1cd]">
                              {lane.now?.title ? `En cours : ${lane.now.title}` : "Aucun programme en cours"}
                            </p>
                          </div>
                          <span
                            className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-medium ${
                              lane.live_stream?.id
                                ? "bg-[#00d39b]/20 text-[#8ef2d2]"
                                : "bg-white/10 text-[#adc2de]"
                            }`}
                          >
                            <Radio className="mr-1 h-3 w-3" />
                            {lane.live_stream?.id ? "Direct" : "Hors antenne"}
                          </span>
                        </div>
                        {lane.next?.title ? (
                          <p className="mt-2 text-xs text-[#7f95b3]">
                            A suivre a {formatClock(lane.next.starts_at)} - {lane.next.title}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {tab === "grid" && (
                <div className="rounded-2xl border border-white/10 bg-[#0d1d38]/70 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#dbe8f8]">
                    <CalendarClock className="h-4 w-4 text-[#7db1ff]" />
                    Grille de diffusion
                  </div>
                  <div className="space-y-2">
                    {(activeLane?.slots ?? []).slice(0, 12).map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#091427] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{slot.title}</p>
                          {slot.notes ? <p className="mt-0.5 text-xs text-[#9cb1cd]">{slot.notes}</p> : null}
                        </div>
                        <p className="shrink-0 text-xs text-[#8ca2bf]">
                          {formatClock(slot.starts_at)} - {formatClock(slot.ends_at)}
                        </p>
                      </div>
                    ))}
                    {(!activeLane || activeLane.slots.length === 0) && (
                      <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-xs text-[#8ba2bf]">
                        Aucune grille publiee pour cette chaine pour le moment.
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
                      className={`rounded-2xl border bg-[#0d1d38]/70 p-3 text-left transition ${
                        activeReplayId === replay.id ? "border-[#4ea0ff]" : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <p className="line-clamp-2 text-sm font-medium text-white">{replay.title}</p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-[#97adca]">
                        <Clapperboard className="h-3.5 w-3.5" />
                        <span>{replay.channel.name || "Replay"}</span>
                        {replay.duration_sec ? <span>- {formatDuration(replay.duration_sec)}</span> : null}
                      </div>
                    </button>
                  ))}
                  {activeReplaysForChannel.length === 0 && (
                    <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-xs text-[#8ba2bf] sm:col-span-2">
                      Aucun replay disponible pour cette chaine.
                    </p>
                  )}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#0d1d38]/70 p-4">
                <p className="font-[var(--font-we-display)] text-sm font-semibold text-white">Contexte editorial</p>
                <div className="mt-3 space-y-2 text-xs text-[#9cb1cd]">
                  <p>
                    Chaine : <span className="text-[#eaf3ff]">{activeLane?.channel.name || "--"}</span>
                  </p>
                  <p>
                    En cours : <span className="text-[#eaf3ff]">{activeLane?.now?.title || "Aucun programme en cours"}</span>
                  </p>
                  <p>
                    A suivre : <span className="text-[#eaf3ff]">{activeLane?.next?.title || "--"}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0d1d38]/70 p-4">
                <p className="mb-3 font-[var(--font-we-display)] text-sm font-semibold text-white">Selection rapide</p>
                <div className="space-y-2">
                  {grid.map((lane) => (
                    <button
                      key={lane.channel.id}
                      type="button"
                      onClick={() => {
                        setTab("live");
                        setActiveReplayId(null);
                        setActiveChannelId(lane.channel.id);
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                        lane.channel.id === activeChannelId
                          ? "border-[#4ea0ff] bg-[#12335e] text-white"
                          : "border-white/10 text-[#b5c7de] hover:border-white/20"
                      }`}
                    >
                      {lane.channel.name}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

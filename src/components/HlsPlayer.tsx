"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

type Props = {
  streamId: string;
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onErrorChange?: (error: string | null) => void;
  enableStatsIngest?: boolean;
  statsIngestIntervalMs?: number;
  statsIngestPaused?: boolean;
  sourceKind?: "hls" | "dash" | "file";
  startAtSec?: number | null;
  onPlaybackProgress?: (snapshot: {
    currentTime: number;
    duration: number | null;
    ended: boolean;
  }) => void;
};

function inferSourceKind(src: string) {
  const normalized = src.toLowerCase();
  if (normalized.includes(".mpd")) return "dash";
  if (normalized.includes(".m3u8")) return "hls";
  return "file";
}

export default function HlsPlayer({
  streamId,
  src,
  poster,
  autoPlay = true,
  muted = true,
  controls = true,
  className,
  onErrorChange,
  enableStatsIngest = false,
  statsIngestIntervalMs = 15000,
  statsIngestPaused = false,
  sourceKind,
  startAtSec = null,
  onPlaybackProgress,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const appliedStartRef = useRef<string | null>(null);
  const recoverAttemptRef = useRef<{ src: string; network: number; media: number }>({
    src,
    network: 0,
    media: 0,
  });

  const bitrateRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

  const [errorToken, setErrorToken] = useState<{ src: string; message: string } | null>(null);
  const staticError =
    (sourceKind ?? inferSourceKind(src)) === "dash"
      ? "Lecture MPEG-DASH non supportee sur cette surface web."
      : null;
  const error = staticError ?? (errorToken?.src === src ? errorToken.message : null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    onErrorChange?.(null);
    errorCountRef.current = 0;
    bitrateRef.current = 0;
    recoverAttemptRef.current = { src, network: 0, media: 0 };
    const effectiveSourceKind = sourceKind ?? inferSourceKind(src);
    const attemptPlay = () => {
      if (!autoPlay) return;
      video.play().catch(() => {});
    };

    if (effectiveSourceKind === "dash") {
      onErrorChange?.("Lecture MPEG-DASH non supportee sur cette surface web.");
      return;
    }

    if (effectiveSourceKind === "file") {
      video.src = src;
      attemptPlay();
      return () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      attemptPlay();
      return () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, attemptPlay);
      hls.on(Hls.Events.MEDIA_ATTACHED, attemptPlay);

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level?.bitrate) {
          bitrateRef.current = Math.round(level.bitrate / 1000);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, payload) => {
        errorCountRef.current += 1;
        if (!payload.fatal) return;

        if (payload.type === Hls.ErrorTypes.NETWORK_ERROR && recoverAttemptRef.current.network < 1) {
          recoverAttemptRef.current.network += 1;
          hls.startLoad();
          return;
        }

        if (payload.type === Hls.ErrorTypes.MEDIA_ERROR && recoverAttemptRef.current.media < 1) {
          recoverAttemptRef.current.media += 1;
          hls.recoverMediaError();
          return;
        }

        const message =
          payload.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
          payload.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR
            ? "Impossible de charger le manifest HLS."
            : "Le flux HLS a rencontre une erreur fatale.";
        setErrorToken({ src, message });
        onErrorChange?.(message);
        hls.destroy();
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    onErrorChange?.("Navigateur non supporte");
  }, [autoPlay, onErrorChange, sourceKind, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const seekKey = `${src}:${startAtSec ?? 0}`;
    const applyStartOffset = () => {
      if (!startAtSec || startAtSec <= 0) return;
      if (appliedStartRef.current === seekKey) return;

      const duration = Number.isFinite(video.duration) ? video.duration : NaN;
      const safeTarget =
        Number.isFinite(duration) && duration > 10
          ? Math.min(startAtSec, Math.max(0, duration - 5))
          : startAtSec;

      try {
        video.currentTime = Math.max(0, safeTarget);
        appliedStartRef.current = seekKey;
      } catch {
        // Ignore browsers that refuse early seeks before metadata is stable.
      }
    };

    const emitProgress = (ended = false) => {
      onPlaybackProgress?.({
        currentTime: Math.max(0, Math.floor(video.currentTime || 0)),
        duration: Number.isFinite(video.duration) ? Math.floor(video.duration) : null,
        ended,
      });
    };

    const handleLoadedMetadata = () => {
      applyStartOffset();
      emitProgress(false);
    };
    const handleTimeUpdate = () => emitProgress(false);
    const handleEnded = () => emitProgress(true);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onPlaybackProgress, src, startAtSec]);

  useEffect(() => {
    if (!streamId || !enableStatsIngest || statsIngestPaused) return;

    const safeIntervalMs = Math.max(5000, Math.floor(statsIngestIntervalMs));

    const publishSample = () => {
      fetch(`/api/streams/${streamId}/stats/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewers: 1,
          bitrate: bitrateRef.current,
          errors: errorCountRef.current,
        }),
      }).catch(() => {});
    };

    publishSample();
    const onVisibility = () => {
      if (!document.hidden) publishSample();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(() => {
      if (document.hidden) return;
      publishSample();
    }, safeIntervalMs);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, [enableStatsIngest, statsIngestIntervalMs, statsIngestPaused, streamId]);

  return (
    <div className={className}>
      {error ? (
        <div className="flex h-full items-center justify-center rounded-lg border border-white/10 bg-black/40 text-sm text-red-300">
          {error}
        </div>
      ) : (
        <video
          ref={videoRef}
          poster={poster}
          preload="metadata"
          controls={controls}
          muted={muted}
          playsInline
          autoPlay={autoPlay}
          className="h-full w-full rounded-lg bg-black"
        />
      )}
    </div>
  );
}

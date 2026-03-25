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
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

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
    const effectiveSourceKind = sourceKind ?? inferSourceKind(src);

    if (effectiveSourceKind === "dash") {
      onErrorChange?.("Lecture MPEG-DASH non supportee sur cette surface web.");
      return;
    }

    if (effectiveSourceKind === "file") {
      video.src = src;
      video.play().catch(() => {});
      return () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
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

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level?.bitrate) {
          bitrateRef.current = Math.round(level.bitrate / 1000);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, payload) => {
        errorCountRef.current += 1;
        if (!payload.fatal) return;
        const message = "Erreur HLS fatale";
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
  }, [onErrorChange, sourceKind, src]);

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

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
};

export default function HlsPlayer({
  streamId,
  src,
  poster,
  autoPlay = true,
  muted = true,
  controls = true,
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const bitrateRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

  const [error, setError] = useState<string | null>(null);

  /* -----------------------------
     Init Player
  ----------------------------- */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    errorCountRef.current = 0;
    bitrateRef.current = 0;

    // Safari (HLS natif)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
      return;
    }

    // hls.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      // Bitrate réel (niveau courant)
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level?.bitrate) {
          bitrateRef.current = Math.round(level.bitrate / 1000); // kbps
        }
      });

      // Erreurs réelles
      hls.on(Hls.Events.ERROR, (_e, data) => {
        errorCountRef.current += 1;
        if (data.fatal) {
          setError("Erreur HLS fatale");
          hls.destroy();
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    setError("Navigateur non supporté");
  }, [src]);

  /* -----------------------------
     Stats ingest (toutes les 5s)
  ----------------------------- */

  useEffect(() => {
    if (!streamId) return;

    const interval = setInterval(() => {
      fetch(`/api/streams/${streamId}/stats/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewers: 1, // 1 player = 1 viewer (agrégation backend)
          bitrate: bitrateRef.current,
          errors: errorCountRef.current,
        }),
      }).catch(() => {});
    }, 5000); // cadence PRO (broadcast standard)

    return () => clearInterval(interval);
  }, [streamId]);

  /* -----------------------------
     Render
  ----------------------------- */

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

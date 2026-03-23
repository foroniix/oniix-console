import { useEffect, useState } from "react";

type Stats = {
  viewers: number;
  bitrate: number;
  fps: number;
  audioLevel: number;
  errors: number;
  health: "Excellent" | "Good" | "Unstable" | "Critical";
  formattedBitrate: string;
};

const INITIAL_STATS: Stats = {
  viewers: 0,
  bitrate: 0,
  fps: 0,
  audioLevel: 0,
  errors: 0,
  health: "Excellent",
  formattedBitrate: "0 kbps",
};

export function useLiveStats(streamId: string, isLive: boolean) {
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);

  useEffect(() => {
    if (!isLive) {
      setStats(INITIAL_STATS);
      return;
    }

    let isMounted = true;

    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/stats`, {
          signal: AbortSignal.timeout(1500),
        });

        if (!res.ok) throw new Error("Stats endpoint unavailable");

        const data = await res.json();
        if (isMounted) setStats(processStats(data));
      } catch {
        if (!isMounted) return;
        setStats((current) =>
          current === INITIAL_STATS
            ? { ...INITIAL_STATS, health: "Critical" }
            : { ...current, health: "Critical" }
        );
      }
    };

    void fetchStats();

    const interval = setInterval(() => {
      void fetchStats();
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [streamId, isLive]);

  return stats;
}

function processStats(data: unknown): Stats {
  const payload =
    typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const bitrate = Number(payload.bitrate ?? 0);

  return {
    viewers: Number(payload.viewers ?? 0),
    bitrate,
    fps: Number(payload.fps ?? 0),
    audioLevel: Number(payload.audioLevel ?? 0),
    errors: Number(payload.errors ?? 0),
    health: (payload.health as Stats["health"] | undefined) ?? "Good",
    formattedBitrate: bitrate > 1000 ? `${(bitrate / 1000).toFixed(1)} Mbps` : `${bitrate} kbps`,
  };
}

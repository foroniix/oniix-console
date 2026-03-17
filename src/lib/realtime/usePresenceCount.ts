"use client";

import { useMemo } from "react";
import { useAnalyticsLiveSnapshot } from "./useAnalyticsLiveSnapshot";

type Status = "idle" | "connecting" | "live" | "error";

export function usePresenceCount(opts: {
  streamId: string | null;
  enabled?: boolean;
  windowSec?: number;
}) {
  const { streamId, enabled = true, windowSec = 35 } = opts;
  const isEnabled = Boolean(enabled && streamId);

  const { snapshot, status } = useAnalyticsLiveSnapshot({
    streamId,
    enabled: isEnabled,
    windowSec,
  });

  const count = useMemo(() => {
    if (!streamId || !snapshot?.live?.currentStreams) return 0;
    const nextCount = Number(snapshot.live.currentStreams[streamId] ?? 0);
    return Number.isFinite(nextCount) ? nextCount : 0;
  }, [snapshot, streamId]);

  if (!isEnabled || !streamId) {
    return { count: 0, status: "idle" as const };
  }

  const normalizedStatus: Status =
    status === "fallback" ? "connecting" : status === "live" ? "live" : status === "error" ? "error" : "connecting";

  return { count, status: normalizedStatus };
}

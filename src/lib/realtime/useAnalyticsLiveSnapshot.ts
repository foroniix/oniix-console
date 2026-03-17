"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalyticsLivePayload } from "@/app/api/_utils/analytics-live";

type LiveTransport = "sse" | "poll" | "none";
type LiveStatus = "idle" | "connecting" | "live" | "fallback" | "error";

type UseAnalyticsLiveSnapshotOptions = {
  channelId?: string | null;
  streamId?: string | null;
  windowSec?: number;
  enabled?: boolean;
};

function buildParams(input: {
  channelId?: string | null;
  streamId?: string | null;
  windowSec: number;
}) {
  const params = new URLSearchParams({
    windowSec: String(input.windowSec),
  });

  if (input.channelId) params.set("channelId", input.channelId);
  if (input.streamId) params.set("streamId", input.streamId);

  return params;
}

export function useAnalyticsLiveSnapshot(opts: UseAnalyticsLiveSnapshotOptions) {
  const { channelId, streamId, windowSec = 35, enabled = true } = opts;
  const isEnabled = enabled;

  const [snapshot, setSnapshot] = useState<AnalyticsLivePayload | null>(null);
  const [status, setStatus] = useState<LiveStatus>(isEnabled ? "connecting" : "idle");
  const [transport, setTransport] = useState<LiveTransport>("none");

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSnapshotAtRef = useRef<number>(0);

  const params = useMemo(
    () =>
      buildParams({
        channelId: channelId ?? null,
        streamId: streamId ?? null,
        windowSec,
      }),
    [channelId, streamId, windowSec]
  );

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let cancelled = false;
    let source: EventSource | null = null;
    lastSnapshotAtRef.current = 0;

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const applySnapshot = (payload: AnalyticsLivePayload, nextTransport: LiveTransport) => {
      lastSnapshotAtRef.current = Date.now();
      setSnapshot(payload);
      setStatus("live");
      setTransport(nextTransport);
    };

    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`/api/analytics/live?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as AnalyticsLivePayload | { error?: string } | null;
        if (cancelled || !res.ok || !json || !("ok" in json) || !json.ok) {
          if (!cancelled) {
            setStatus("error");
            setTransport("poll");
          }
          return;
        }

        applySnapshot(json, "poll");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setTransport("poll");
        }
      }
    };

    const startPolling = (reason: LiveStatus = "fallback") => {
      if (pollTimerRef.current) return;
      setStatus(reason);
      setTransport("poll");
      void fetchSnapshot();
      pollTimerRef.current = setInterval(() => {
        void fetchSnapshot();
      }, 5_000);
    };

    const stopWatchdog = () => {
      if (watchTimerRef.current) {
        clearInterval(watchTimerRef.current);
        watchTimerRef.current = null;
      }
    };

    if (typeof window !== "undefined" && "EventSource" in window) {
      queueMicrotask(() => {
        if (cancelled) return;
        setStatus("connecting");
        setTransport("none");
      });

      source = new EventSource(`/api/analytics/live/stream?${params.toString()}`);

      source.onopen = () => {
        if (cancelled) return;
        stopPolling();
        setTransport("sse");
      };

      source.addEventListener("snapshot", (event) => {
        if (cancelled) return;

        try {
          const payload = JSON.parse((event as MessageEvent<string>).data) as AnalyticsLivePayload;
          if (!payload?.ok) return;
          stopPolling();
          applySnapshot(payload, "sse");
        } catch {
          startPolling("fallback");
        }
      });

      source.addEventListener("error", () => {
        if (cancelled) return;
        startPolling("fallback");
      });

      watchTimerRef.current = setInterval(() => {
        if (cancelled) return;
        const age = Date.now() - lastSnapshotAtRef.current;
        if (lastSnapshotAtRef.current > 0 && age <= 10_000) {
          stopPolling();
          return;
        }

        if (document.visibilityState === "hidden") {
          return;
        }

        startPolling("fallback");
      }, 5_000);
    } else {
      startPolling("fallback");
    }

    return () => {
      cancelled = true;
      lastSnapshotAtRef.current = 0;
      stopPolling();
      stopWatchdog();
      if (source) {
        source.close();
      }
    };
  }, [isEnabled, params]);

  const refresh = async () => {
    if (!isEnabled) return;
    try {
      const res = await fetch(`/api/analytics/live?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as AnalyticsLivePayload | null;
      if (!res.ok || !json?.ok) return;
      lastSnapshotAtRef.current = Date.now();
      setSnapshot(json);
      setStatus("live");
      setTransport("poll");
    } catch {
      // ignore manual refresh errors
    }
  };

  return {
    snapshot: isEnabled ? snapshot : null,
    status: isEnabled ? status : ("idle" as const),
    transport: isEnabled ? transport : ("none" as const),
    refresh,
  };
}

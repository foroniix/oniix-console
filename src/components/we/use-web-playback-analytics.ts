"use client";

import { useCallback, useEffect, useRef } from "react";

type PlayableType = "movie" | "episode" | "replay";

type Snapshot = {
  currentTime: number;
  duration: number | null;
  ended: boolean;
};

type Params = {
  playableType: PlayableType | null;
  playableId: string | null;
  enabled?: boolean;
};

function buildSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function detectOs() {
  if (typeof navigator === "undefined") return "Web";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os")) return "macOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
  if (ua.includes("linux")) return "Linux";
  return "Web";
}

export function useWebPlaybackAnalytics({ playableType, playableId, enabled = true }: Params) {
  const sessionIdRef = useRef<string>("");
  const latestSnapshotRef = useRef<Snapshot | null>(null);
  const startedRef = useRef(false);
  const stoppedRef = useRef(false);

  const sendEvent = useCallback(
    async (eventType: "START" | "HEARTBEAT" | "STOP", snapshot: Snapshot | null) => {
      if (!enabled || !playableType || !playableId || !sessionIdRef.current) return;

      try {
        await fetch("/api/web/analytics/playback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            playable_type: playableType,
            playable_id: playableId,
            event_type: eventType,
            position_sec: snapshot ? Math.max(0, Math.floor(snapshot.currentTime || 0)) : null,
            duration_sec: snapshot?.duration ?? null,
            device_type: "desktop-web",
            os: detectOs(),
          }),
        });
      } catch (error) {
        console.error("web_playback_analytics_failed", error);
      }
    },
    [enabled, playableId, playableType]
  );

  useEffect(() => {
    if (!enabled || !playableType || !playableId) {
      sessionIdRef.current = "";
      latestSnapshotRef.current = null;
      startedRef.current = false;
      stoppedRef.current = false;
      return;
    }

    sessionIdRef.current = buildSessionId();
    latestSnapshotRef.current = null;
    startedRef.current = false;
    stoppedRef.current = false;

    return () => {
      if (startedRef.current && !stoppedRef.current && latestSnapshotRef.current) {
        stoppedRef.current = true;
        void sendEvent("STOP", latestSnapshotRef.current);
      }
    };
  }, [enabled, playableId, playableType, sendEvent]);

  useEffect(() => {
    if (!enabled || !playableType || !playableId) return;

    const timer = setInterval(() => {
      if (!startedRef.current || stoppedRef.current || !latestSnapshotRef.current) return;
      void sendEvent("HEARTBEAT", latestSnapshotRef.current);
    }, 15000);

    return () => clearInterval(timer);
  }, [enabled, playableId, playableType, sendEvent]);

  const trackPlayback = useCallback(
    (snapshot: Snapshot) => {
      latestSnapshotRef.current = snapshot;
      if (!enabled || !playableType || !playableId) return;

      if (!startedRef.current && snapshot.currentTime >= 1) {
        startedRef.current = true;
        void sendEvent("START", snapshot);
      }

      if (snapshot.ended && startedRef.current && !stoppedRef.current) {
        stoppedRef.current = true;
        void sendEvent("STOP", snapshot);
      }
    },
    [enabled, playableId, playableType, sendEvent]
  );

  return { trackPlayback };
}

"use client";

import { useEffect, useMemo } from "react";

function getOrCreateSessionId() {
  const key = "oniix_session_id";
  let v = "";
  try {
    v = localStorage.getItem(key) || "";
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(key, v);
    }
  } catch {
    v = `sess_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
  return v;
}

function deviceHint() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/mobile/i.test(ua)) return "mobile";
  if (/tablet/i.test(ua)) return "tablet";
  return "desktop";
}

/**
 * Envoie START + heartbeats toutes les 15s + STOP au cleanup.
 * Appelle ce hook dans le composant Player.
 */
export function useStreamHeartbeat(streamId: string | null | undefined, opts?: { intervalSec?: number }) {
  const intervalSec = opts?.intervalSec ?? 15;

  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  useEffect(() => {
    if (!streamId) return;

    let stopped = false;

    const send = async (kind: "START" | "HEARTBEAT" | "STOP", force = false) => {
      if (stopped && !force) return;
      try {
        await fetch("/api/analytics/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            stream_id: streamId,
            device: deviceHint(),
            kind,
          }),
        });
      } catch {
        // ignore
      }
    };

    // immediate start
    void send("START");

    const t = setInterval(() => {
      void send("HEARTBEAT");
    }, intervalSec * 1000);
    return () => {
      void send("STOP", true);
      stopped = true;
      clearInterval(t);
    };
  }, [sessionId, streamId, intervalSec]);
}

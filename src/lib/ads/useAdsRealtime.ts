"use client";

import { useEffect, useState } from "react";

type LiveCounters = {
  impressions: number;
  clicks: number;
  lastEventAt?: string | null;
};

type LiveEvent = {
  id: string;
  event: "IMPRESSION" | "CLICK" | "START" | "COMPLETE" | "SKIP";
  campaign_id: string | null;
  creative_id: string | null;
  channel_id?: string | null;
  stream_id: string | null;
  created_at: string;
};

type LiveResponse =
  | {
      ok: true;
      counters: LiveCounters;
      events: LiveEvent[];
    }
  | { ok?: false; error?: string };

export function useAdsRealtime(opts: {
  channelId?: string | null;
  streamId?: string | null;
  enabled?: boolean;
  windowSec?: number;
}) {
  const { channelId, streamId, enabled = true, windowSec = 300 } = opts;

  const [counters, setCounters] = useState<LiveCounters>({ impressions: 0, clicks: 0 });
  const [events, setEvents] = useState<LiveEvent[]>([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams({
          limit: "25",
          windowSec: String(windowSec),
        });
        if (channelId) params.set("channelId", channelId);
        if (streamId) params.set("streamId", streamId);

        const res = await fetch(`/api/ads/live?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as LiveResponse | null;

        if (cancelled || !res.ok || !json || !("ok" in json) || !json.ok) return;
        setCounters(json.counters);
        setEvents(json.events);
      } catch {
        if (cancelled) return;
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [channelId, enabled, streamId, windowSec]);

  return { counters, events };
}

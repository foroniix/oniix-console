"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type LiveCounters = {
  impressions: number;
  clicks: number;
  lastEventAt?: string;
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

export function useAdsRealtime(opts: {
  accessToken: string | null;
  tenantId: string | null;
  channelId?: string | null; // ✅ NEW
  streamId?: string | null;
  enabled?: boolean;
}) {
  const { accessToken, tenantId, channelId, streamId, enabled = true } = opts;

  const [counters, setCounters] = useState<LiveCounters>({ impressions: 0, clicks: 0 });
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const channelRef = useRef<any>(null);

  const sb = useMemo(() => {
    if (!accessToken) return null;
    return supabaseBrowser(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!enabled) return;
    if (!sb || !tenantId) return;

    // cleanup previous channel
    if (channelRef.current) {
      try {
        sb.removeChannel(channelRef.current);
      } catch {}
      channelRef.current = null;
    }

    /**
     * ✅ Filter priority:
     * 1) streamId -> tenant + stream
     * 2) channelId -> tenant + channel
     * 3) tenant only
     *
     * Important: Postgres Changes filter must match real DB column names.
     */
    const parts = [`tenant_id=eq.${tenantId}`];

    if (streamId) {
      parts.push(`stream_id=eq.${streamId}`);
    } else if (channelId) {
      parts.push(`channel_id=eq.${channelId}`);
    }

    const filter = parts.join(",");

    const chName = `ads_live_${tenantId}${streamId ? `_${streamId}` : channelId ? `_${channelId}` : ""}`;

    const ch = sb
      .channel(chName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ad_events", filter },
        (payload: any) => {
          const row = payload.new as LiveEvent;

          setEvents((prev) => [row, ...prev].slice(0, 50));
          setCounters((prev) => {
            const next: LiveCounters = { ...prev, lastEventAt: row.created_at };
            if (row.event === "IMPRESSION") next.impressions += 1;
            if (row.event === "CLICK") next.clicks += 1;
            return next;
          });
        }
      )
      .subscribe();

    channelRef.current = ch;

    return () => {
      try {
        if (channelRef.current) sb.removeChannel(channelRef.current);
      } catch {}
      channelRef.current = null;
    };
  }, [sb, tenantId, channelId, streamId, enabled]);

  return { counters, events };
}

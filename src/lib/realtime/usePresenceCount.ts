"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Status = "idle" | "connecting" | "live" | "error";

export function usePresenceCount(opts: {
  accessToken: string | null;
  channelName: string | null;
  enabled?: boolean;
}) {
  const { accessToken, channelName, enabled = true } = opts;

  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const chRef = useRef<any>(null);

  const sb = useMemo(() => {
    if (!accessToken) return null;
    return supabaseBrowser(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!enabled || !sb || !channelName) return;

    // cleanup
    if (chRef.current) {
      try {
        sb.removeChannel(chRef.current);
      } catch {}
      chRef.current = null;
    }

    setStatus("connecting");
    setCount(0);

    // Presence only (pas de postgres_changes)
    const ch = sb.channel(channelName, {
      config: { presence: { key: "console" } },
    });

    ch.on("presence", { event: "sync" }, () => {
      try {
        const state = ch.presenceState();
        setCount(Object.keys(state).length);
        setStatus("live");
      } catch {
        setStatus("error");
      }
    });

    ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        try {
          await ch.track({ online_at: new Date().toISOString() });
        } catch {}
      }
    });

    chRef.current = ch;

    return () => {
      try {
        if (chRef.current) sb.removeChannel(chRef.current);
      } catch {}
      chRef.current = null;
    };
  }, [sb, channelName, enabled]);

  return { count, status };
}

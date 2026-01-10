import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

type Stats = {
  viewers: number;
  bitrate: number;
  errors: number;
};

export function useLiveStatsRealtime(streamId: string, active: boolean) {
  const [stats, setStats] = useState<Stats>({
    viewers: 0,
    bitrate: 0,
    errors: 0,
  });

  useEffect(() => {
    if (!active) return;

    // 1. Charger la dernière stat connue
    supabase
      .from("stream_stats")
      .select("viewers, bitrate_kbps, errors")
      .eq("stream_id", streamId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setStats({
            viewers: data.viewers,
            bitrate: data.bitrate_kbps,
            errors: data.errors,
          });
        }
      });

    // 2. Subscribe realtime
    const channel = supabase
      .channel(`stats:${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stream_stats",
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const s = payload.new as any;
          setStats({
            viewers: s.viewers,
            bitrate: s.bitrate_kbps,
            errors: s.errors,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, active]);

  return stats;
}

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useRef, useState } from "react";

// Le format "prêt à l'emploi" pour l'UI
export type UIStats = {
  viewers: number;
  bitrate: number;
  errors: number;
  fps: number; // Si absent en DB, on mettra une valeur par défaut
  audioLevel: number; // Pour l'animation
  health: "Excellent" | "Good" | "Unstable" | "Critical";
  formattedBitrate: string;
};

const INITIAL_STATS: UIStats = {
  viewers: 0,
  bitrate: 0,
  errors: 0,
  fps: 0,
  audioLevel: 0,
  health: "Excellent",
  formattedBitrate: "0 kbps",
};

export function useLiveStatsRealtime(streamId: string, isLive: boolean) {
  const [stats, setStats] = useState<UIStats>(INITIAL_STATS);
  
  // Ref pour l'animation audio (car la DB est souvent trop lente pour un vumètre fluide)
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLive) {
      setStats(INITIAL_STATS);
      return;
    }

    // 1. Fonction de transformation : Raw DB Data -> UI Data
    const processDBData = (data: any) => {
      const bitrate = data.bitrate_kbps || 0;
      const errors = data.errors || 0;
      
      // Logique métier pour déterminer la santé du flux
      let health: UIStats["health"] = "Excellent";
      if (errors > 0) health = "Critical";
      else if (bitrate < 2000) health = "Unstable";
      else if (bitrate < 4000) health = "Good";

      setStats(prev => ({
        ...prev,
        viewers: data.viewers || 0,
        bitrate: bitrate,
        errors: errors,
        fps: data.fps || 60, // Fallback si pas en DB
        health,
        formattedBitrate: bitrate > 1000 
          ? `${(bitrate / 1000).toFixed(1)} Mbps` 
          : `${bitrate} kbps`
      }));
    };

    // 2. Charger la dernière stat connue
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("stream_stats")
        .select("*") // On prend tout
        .eq("stream_id", streamId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (data) processDBData(data);
    };

    fetchInitial();

    // 3. Subscribe Realtime (Supabase)
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
          processDBData(payload.new);
        }
      )
      .subscribe();

    // 4. Simulation Audio Locale (Bonus UX)
    // Une base de données ne met pas à jour le volume 60 fois par seconde.
    // On simule donc une fluctuation visuelle pour que l'interface paraisse "vivante" 
    // tant que le flux est considéré comme "LIVE".
    audioIntervalRef.current = setInterval(() => {
      setStats(prev => ({
        ...prev,
        // Génère un chiffre aléatoire entre 30 et 80
        audioLevel: Math.floor(Math.random() * 50) + 30 
      }));
    }, 100);

    return () => {
      supabase.removeChannel(channel);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [streamId, isLive]);

  return stats;
}
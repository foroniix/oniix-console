import { useEffect, useRef, useState } from "react";

type Stats = {
  viewers: number;
  bitrate: number; // en kbps
  fps: number;
  audioLevel: number; // 0 à 100 (pour le vumètre)
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
  // Ref pour éviter les re-renders inutiles sur les intervalles
  const errorCountRef = useRef(0);

  useEffect(() => {
    // Si le flux n'est pas LIVE, on reset tout
    if (!isLive) {
      setStats(INITIAL_STATS);
      return;
    }

    let isMounted = true;

    const fetchOrSimulate = async () => {
      try {
        // TENTATIVE D'APPEL API RÉEL
        // Si vous n'avez pas encore d'API, cela échouera et passera au catch (simulation)
        const res = await fetch(`/api/streams/${streamId}/stats`, { 
            signal: AbortSignal.timeout(1000) // Timeout rapide pour passer en simu si pas de réponse
        });
        
        if (!res.ok) throw new Error("API unavailable");
        
        const data = await res.json();
        if (isMounted) setStats(processStats(data));

      } catch (err) {
        // MODE SIMULATION (Fallback pour la démo)
        // Génère des fluctuations réalistes pour rendre l'UI vivante
        if (isMounted) {
          const simulatedBitrate = 4500 + Math.random() * 500 - 250; // Fluctue autour de 4500
          const simulatedAudio = Math.floor(Math.random() * 60) + 20; // Audio entre 20 et 80%
          
          setStats({
            viewers: 1250 + Math.floor(Math.random() * 10),
            bitrate: Math.floor(simulatedBitrate),
            fps: 60,
            audioLevel: simulatedAudio, 
            errors: errorCountRef.current,
            health: simulatedBitrate < 2000 ? "Critical" : "Excellent",
            formattedBitrate: `${(simulatedBitrate / 1000).toFixed(1)} Mbps`
          });
        }
      }
    };

    // Appel initial
    fetchOrSimulate();

    // Polling toutes les 2 secondes (plus rapide pour un effet temps réel)
    const interval = setInterval(fetchOrSimulate, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [streamId, isLive]);

  return stats;
}

// Helper pour formater les données brutes de l'API si besoin
function processStats(data: any): Stats {
  return {
    ...data,
    formattedBitrate: data.bitrate > 1000 
      ? `${(data.bitrate / 1000).toFixed(1)} Mbps` 
      : `${data.bitrate} kbps`
  };
}
"use client";

import { Badge } from "@/components/ui/badge";
import { type Stream } from "@/lib/data";
import {
  Activity,
  AlertTriangle,
  Eye,
  Maximize2,
  MoreVertical,
  RefreshCcw,
  Signal,
  Volume2
} from "lucide-react";
import { useLiveStatsRealtime } from "../streams/useLiveStatsRealtime"; // Assurez-vous que le chemin est bon

interface LiveMonitorProps {
  streams: Stream[];
}

export default function LiveMonitor({ streams }: LiveMonitorProps) {
  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
        <Activity className="w-12 h-12 text-zinc-700 mb-4" />
        <h3 className="text-zinc-400 font-medium">Aucun flux en direct</h3>
        <p className="text-zinc-600 text-sm">Démarrez un flux dans l'onglet "Gestion" pour le voir ici.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {streams.map((stream) => (
        <StreamCard key={stream.id} stream={stream} />
      ))}
    </div>
  );
}

function StreamCard({ stream }: { stream: Stream }) {
  const isLive = stream.status === "LIVE";
  
  // Connexion au Hook Realtime
  const stats = useLiveStatsRealtime(stream.id, isLive);

  // Calcul de la couleur de santé
  const healthColor = {
    Excellent: "bg-emerald-500 text-white",
    Good: "bg-emerald-600 text-white",
    Unstable: "bg-amber-500 text-black",
    Critical: "bg-rose-500 text-white",
  }[stats.health];

  return (
    <div className="group relative bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-lg hover:border-zinc-600 transition-all duration-300">
      
      {/* --- HEADER OVERLAY (Visible au survol) --- */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 flex justify-between items-start bg-gradient-to-b from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="bg-black/40 border-white/10 text-white backdrop-blur-md font-normal">
             {stream.title}
           </Badge>
           {/* Badge de Santé dynamique */}
           <Badge className={`${healthColor} h-5 px-1.5 text-[10px] hover:${healthColor} transition-colors`}>
             {isLive ? `${stats.fps} FPS` : 'OFF'}
           </Badge>
        </div>
        <button className="p-1.5 hover:bg-white/10 rounded text-white transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* --- VIDEO AREA --- */}
      <div className="aspect-video bg-zinc-900 relative flex items-center justify-center overflow-hidden">
        {!isLive ? (
          <div className="flex flex-col items-center text-rose-500/80 animate-pulse">
            <AlertTriangle className="w-10 h-10 mb-2" />
            <span className="font-mono text-xs font-bold tracking-[0.2em]">NO SIGNAL</span>
          </div>
        ) : (
          <>
            {/* Image de fond simulée (ou <video> réelle plus tard) */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-50 group-hover:opacity-70 transition-opacity grayscale hover:grayscale-0"></div>
            
            {/* Compteur Viewers (Overlay permanent discret) */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm rounded border border-white/5 text-[10px] text-zinc-300 font-mono shadow-sm">
               <Eye className="w-3 h-3 text-indigo-400" />
               {stats.viewers.toLocaleString()}
            </div>
          </>
        )}
      </div>

      {/* --- FOOTER CONTROLS --- */}
      <div className="bg-zinc-900/80 backdrop-blur border-t border-zinc-800 p-3 flex items-center justify-between">
        
        {/* Vumètre Audio Connecté */}
        <div className="flex items-center gap-2">
           <Volume2 className={`w-4 h-4 transition-colors ${stats.audioLevel > 10 ? 'text-zinc-200' : 'text-zinc-600'}`} />
           <div className="flex gap-0.5 items-end h-4 w-16">
             {[...Array(8)].map((_, i) => (
               <AudioBar 
                 key={i} 
                 index={i} 
                 // La barre s'active si le niveau audio global dépasse un certain seuil proportionnel
                 active={isLive && stats.audioLevel > (i * 12)} 
                 // Ajoute un peu de chaos aléatoire local pour faire réaliste
                 chaos={stats.audioLevel > 0} 
               />
             ))}
           </div>
        </div>

        {/* Données Techniques (Bitrate) */}
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Signal className={`w-3 h-3 ${stats.health === 'Excellent' ? 'text-emerald-500' : 'text-zinc-600'}`} />
            <span className={isLive ? "text-zinc-200" : "text-zinc-600"}>
              {stats.formattedBitrate}
            </span>
          </div>
          <div className="flex gap-1 border-l border-zinc-800 pl-3">
             <RefreshCcw className="w-4 h-4 hover:text-white cursor-pointer transition-colors hover:rotate-180 duration-500" />
             <Maximize2 className="w-4 h-4 hover:text-white cursor-pointer transition-colors ml-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant AudioBar amélioré pour réagir aux données
function AudioBar({ index, active, chaos }: { index: number, active: boolean, chaos: boolean }) {
  // On génère une hauteur de base selon l'index (les premières barres sont plus hautes)
  // + une variation si "chaos" est actif
  
  return (
    <div 
      className={`w-1.5 rounded-[1px] transition-all duration-150 ease-out ${
        active ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'bg-zinc-800'
      }`}
      style={{
        // Si actif, hauteur aléatoire pour simuler la voix/musique. Si inactif, 2px.
        height: active ? `${30 + Math.random() * 70}%` : '2px', 
      }}
    />
  );
}
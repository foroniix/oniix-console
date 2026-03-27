"use client";

import { Badge } from "@/components/ui/badge";
import { type Stream } from "@/lib/data";
import {
  Activity,
  AlertTriangle,
  Eye,
  Signal,
  Volume2
} from "lucide-react";
import { useLiveStatsRealtime } from "../streams/useLiveStatsRealtime";

interface LiveMonitorProps {
  streams: Stream[];
}

export default function LiveMonitor({ streams }: LiveMonitorProps) {
  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
        <Activity className="w-12 h-12 text-zinc-700 mb-4" />
        <h3 className="text-zinc-400 font-medium">Aucun flux en direct</h3>
        <p className="text-zinc-600 text-sm">Demarrez un flux dans l&apos;onglet &quot;Gestion&quot; pour le voir ici.</p>
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
  const stats = useLiveStatsRealtime(stream.id, isLive);

  const healthColor = {
    Excellent: "bg-emerald-500 text-white",
    Good: "bg-emerald-600 text-white",
    Unstable: "bg-amber-500 text-black",
    Critical: "bg-rose-500 text-white",
  }[stats.health];

  return (
    <div className="group relative bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-lg hover:border-zinc-600 transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-start justify-between bg-gradient-to-b from-black/90 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-black/40 border-white/10 text-white backdrop-blur-md font-normal">
            {stream.title}
          </Badge>
          <Badge className={`${healthColor} h-5 px-1.5 text-[10px]`}>
            {isLive ? `${stats.fps} FPS` : "OFF"}
          </Badge>
        </div>
        <div className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300 backdrop-blur-md">
          {stream.id.slice(0, 6)}
        </div>
      </div>

      <div className="aspect-video bg-zinc-900 relative flex items-center justify-center overflow-hidden">
        {!isLive ? (
          <div className="flex flex-col items-center text-rose-500/80 animate-pulse">
            <AlertTriangle className="w-10 h-10 mb-2" />
            <span className="font-mono text-xs font-bold tracking-[0.2em]">NO SIGNAL</span>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_26%),linear-gradient(135deg,rgba(6,10,16,0.98),rgba(16,24,39,0.9))]" />
            <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="absolute left-4 top-4 rounded border border-white/10 bg-black/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300 backdrop-blur-sm">
              Live preview
            </div>
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm rounded border border-white/5 text-[10px] text-zinc-300 font-mono shadow-sm">
               <Eye className="w-3 h-3 text-indigo-400" />
               {stats.viewers.toLocaleString()}
            </div>
          </>
        )}
      </div>

      <div className="bg-zinc-900/80 backdrop-blur border-t border-zinc-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Volume2 className={`w-4 h-4 transition-colors ${stats.audioLevel > 10 ? 'text-zinc-200' : 'text-zinc-600'}`} />
           <div className="flex gap-0.5 items-end h-4 w-16">
             {[...Array(8)].map((_, i) => (
               <AudioBar 
                 key={i} 
                  index={i} 
                 active={isLive && stats.audioLevel > (i * 12)} 
                 chaos={stats.audioLevel > 0} 
               />
             ))}
           </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Signal className={`w-3 h-3 ${stats.health === 'Excellent' ? 'text-emerald-500' : 'text-zinc-600'}`} />
            <span className={isLive ? "text-zinc-200" : "text-zinc-600"}>
              {stats.formattedBitrate}
            </span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-3">
            <AlertTriangle className={`w-3 h-3 ${stats.errors > 0 ? 'text-rose-400' : 'text-zinc-600'}`} />
            <span className={stats.errors > 0 ? "text-rose-200" : "text-zinc-500"}>
              {stats.errors} err
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant AudioBar ameliore pour reagir aux donnees
function AudioBar({ index, active, chaos }: { index: number, active: boolean, chaos: boolean }) {
  return (
    <div 
      className={`w-1.5 rounded-[1px] transition-all duration-150 ease-out ${
        active ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'bg-zinc-800'
      }`}
      style={{
        height: active ? `${28 + index * 7 + (chaos ? 6 : 0)}%` : `${2 + Math.min(index, 2)}px`,
      }}
    />
  );
}

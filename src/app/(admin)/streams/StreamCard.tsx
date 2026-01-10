"use client";

import HlsPlayer from "@/components/HlsPlayer";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Channel, Stream } from "@/lib/data";
import { Tv, Wifi } from "lucide-react";

// ✅ HOOK REALTIME
import { useLiveStatsRealtime } from "./useLiveStatsRealtime";

type Props = {
  stream: Stream;
  channel?: Channel;
  onOpen: () => void;
};

export default function StreamCard({ stream, channel, onOpen }: Props) {
  // 🔴 Stats RÉELLES temps réel (Supabase Realtime)
  const stats = useLiveStatsRealtime(
    stream.id,
    stream.status === "LIVE"
  );

  return (
    <Card
      onClick={onOpen}
      className="cursor-pointer overflow-hidden bg-[#0b0e13] border-white/10 hover:border-white/20 transition"
    >
      {/* Preview */}
      <div className="aspect-video bg-black">
        <HlsPlayer
          streamId={stream.id}
          src={stream.hlsUrl}
          muted
          autoPlay
          controls={false}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Meta */}
      <div className="p-2 space-y-1">
        <div className="truncate font-semibold text-white">
          {stream.title}
        </div>

        <div className="truncate text-xs text-zinc-400">
          {channel?.name ?? "—"}
        </div>

        {/* Stats LIVE */}
        {stream.status === "LIVE" && (
          <div className="flex gap-3 text-xs text-zinc-300">
            <span className="flex items-center gap-1">
              <Tv size={12} />
              {stats.viewers}
            </span>
            <span className="flex items-center gap-1">
              <Wifi size={12} />
              {stats.bitrate} kbps
            </span>
          </div>
        )}

        <Badge className="mt-1">{stream.status}</Badge>
      </div>
    </Card>
  );
}

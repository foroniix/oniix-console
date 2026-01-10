"use client";

import HlsPlayer from "@/components/HlsPlayer";
import {
  type Stream,
  endLiveAndCreateReplay,
  listStreams,
  setStreamStatus,
} from "@/lib/data";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLiveStats } from "../useLiveStats";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import {
  AlertTriangle,
  MonitorPlay,
  Play,
  Square,
  Tv,
  Volume2,
  VolumeX,
  Wifi,
} from "lucide-react";

export default function StreamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [stream, setStream] = useState<Stream | null>(null);
  const [muted, setMuted] = useState(true);

  // Load stream
  useEffect(() => {
    const load = async () => {
      const all = await listStreams();
      const s = all.find((x) => x.id === id);
      setStream(s ?? null);
    };
    load();
  }, [id]);

  const stats = useLiveStats(id, stream?.status === "LIVE");

  if (!stream) {
    return (
      <div className="text-zinc-400">
        Chargement du flux…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">
            {stream.title}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
            <Badge>{stream.status}</Badge>
            {stream.status === "LIVE" && (
              <>
                <span className="flex items-center gap-1">
                  <Tv size={14} /> {stats.viewers}
                </span>
                <span className="flex items-center gap-1">
                  <Wifi size={14} /> {stats.bitrate} kbps
                </span>
              </>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
      </div>

      {/* Player */}
      <div className="aspect-video overflow-hidden rounded border border-white/10 bg-black">
        <HlsPlayer
  streamId={stream.id}
  src={stream.hlsUrl}
  autoPlay
  muted={muted}
  controls
  className="h-full w-full"
/>

      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Stats */}
        <Card className="border-white/10 bg-[#0b0e13] p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Statistiques LIVE
          </h3>

          <div className="space-y-2 text-sm text-zinc-300">
            <div className="flex justify-between">
              <span>Viewers</span>
              <span>{stats.viewers}</span>
            </div>
            <div className="flex justify-between">
              <span>Bitrate</span>
              <span>{stats.bitrate} kbps</span>
            </div>
            <div className="flex justify-between">
              <span>Errors</span>
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle size={14} /> 0
              </span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <Card className="md:col-span-2 border-white/10 bg-[#0b0e13] p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Actions opérateur
          </h3>

          <div className="flex flex-wrap gap-3">
            {stream.status !== "LIVE" && (
              <Button
                onClick={async () => {
                  const updated = await setStreamStatus(stream.id, "LIVE");
                  setStream(updated);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Passer LIVE
              </Button>
            )}

            <Button
              onClick={async () => {
                await endLiveAndCreateReplay(stream.id, {
                  title: stream.title,
                });
              }}
              variant="secondary"
            >
              <MonitorPlay className="mr-2 h-4 w-4" />
              Créer replay
            </Button>

            <Button
              variant="destructive"
              onClick={() => alert("STOP stream (à brancher backend)")}
            >
              <Square className="mr-2 h-4 w-4" />
              Stop flux
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Channel, type Stream } from "@/lib/data";
import { Edit3, MoreHorizontal, Play, SignalHigh, StopCircle, Trash2, WifiOff } from "lucide-react";

interface StreamsTableProps {
  streams: Stream[];
  channels: Channel[];
  // AJOUT : Callback props
  onEdit: (stream: Stream) => void;
  onDelete: (streamId: string) => void;
  onToggleStatus: (stream: Stream, newStatus: 'LIVE' | 'OFFLINE') => void;
}

export default function StreamsTable({ streams, channels, onEdit, onDelete, onToggleStatus }: StreamsTableProps) {
  return (
    <div className="rounded-md border border-white/10 overflow-hidden">
      <Table>
        <TableHeader className="bg-zinc-900/50">
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="w-[50px] text-zinc-400">#</TableHead>
            <TableHead className="text-zinc-400">Nom du Flux</TableHead>
            <TableHead className="text-zinc-400">Statut</TableHead>
            <TableHead className="text-zinc-400">Source</TableHead>
            <TableHead className="text-right text-zinc-400">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {streams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                Aucun flux détecté.
              </TableCell>
            </TableRow>
          ) : (
            streams.map((stream) => (
              <TableRow key={stream.id} className="border-white/5 hover:bg-zinc-800/50 transition-colors group">
                <TableCell className="font-mono text-zinc-600 text-xs">{stream.id.slice(0, 4)}</TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center border border-white/5 shadow-inner">
                      <span className="text-xs font-bold text-zinc-400">
                        {stream.title ? stream.title.slice(0, 2).toUpperCase() : "??"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-200">{stream.title}</span>
                      <span className="text-xs text-zinc-500 font-mono truncate max-w-[150px]">{stream.hlsUrl}</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <StatusBadge status={stream.status} />
                </TableCell>

                <TableCell>
                  <span className="text-sm text-zinc-300">
                    {channels.find((c) => c.id === stream.channelId)?.name || "Non assigné"}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      
                      {/* BOUTONS D'ACTION CONNECTÉS */}
                      <DropdownMenuItem onClick={() => onToggleStatus(stream, 'LIVE')} className="focus:bg-zinc-800 cursor-pointer">
                        <Play className="mr-2 h-4 w-4 text-emerald-500" /> Démarrer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleStatus(stream, 'OFFLINE')} className="focus:bg-zinc-800 cursor-pointer">
                        <StopCircle className="mr-2 h-4 w-4 text-amber-500" /> Arrêter
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator className="bg-zinc-800" />
                      
                      <DropdownMenuItem onClick={() => onEdit(stream)} className="focus:bg-zinc-800 cursor-pointer">
                        <Edit3 className="mr-2 h-4 w-4" /> Configurer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(stream.id)} className="focus:bg-zinc-800 text-rose-500 focus:text-rose-400 cursor-pointer">
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "LIVE") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        LIVE
      </div>
    );
  }
  
  if (status === "OFFLINE" || status === "ENDED") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium">
        <WifiOff className="w-3 h-3" />
        OFFLINE
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium">
      <SignalHigh className="w-3 h-3" />
      {status}
    </div>
  );
}
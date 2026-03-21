"use client";

import Link from "next/link";
import { ExternalLink, MoreHorizontal, Pencil, Play, Square, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Channel, type Stream } from "@/lib/data";

interface StreamsTableProps {
  streams: Stream[];
  channels: Channel[];
  onEdit: (stream: Stream) => void;
  onDelete: (streamId: string) => void;
  onToggleStatus: (stream: Stream, newStatus: "LIVE" | "OFFLINE") => void;
}

function getChannelLabel(stream: Stream, channels: Channel[]) {
  return channels.find((channel) => channel.id === stream.channelId)?.name ?? "Aucune chaine";
}

export default function StreamsTable({ streams, channels, onEdit, onDelete, onToggleStatus }: StreamsTableProps) {
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-[rgba(10,16,24,0.96)] backdrop-blur">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[108px]">ID</TableHead>
          <TableHead>Flux</TableHead>
          <TableHead className="w-[160px]">Statut</TableHead>
          <TableHead className="w-[220px]">Chaine</TableHead>
          <TableHead className="w-[72px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {streams.map((stream) => {
          const isLive = stream.status === "LIVE";

          return (
            <TableRow key={stream.id}>
              <TableCell>
                <div className="inline-flex rounded-[12px] border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  {stream.id.slice(0, 8)}
                </div>
              </TableCell>

              <TableCell>
                <div className="min-w-0 space-y-1.5">
                  <Link
                    href={`/streams/${stream.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-white transition-colors hover:text-[var(--brand-primary)]"
                  >
                    <span className="truncate">{stream.title}</span>
                    <ExternalLink className="size-3.5" />
                  </Link>
                  <div className="max-w-[34rem] truncate font-mono text-[12px] text-slate-500">{stream.hlsUrl}</div>
                </div>
              </TableCell>

              <TableCell>
                <StatusBadge status={stream.status} />
              </TableCell>

              <TableCell className="text-sm text-slate-200">{getChannelLabel(stream, channels)}</TableCell>

              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" title="Actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href={`/streams/${stream.id}`}>
                        <ExternalLink className="size-4" />
                        Voir le detail
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(stream)}>
                      <Pencil className="size-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {isLive ? (
                      <DropdownMenuItem onClick={() => onToggleStatus(stream, "OFFLINE")}>
                        <Square className="size-4 text-amber-300" />
                        Passer hors ligne
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onToggleStatus(stream, "LIVE")}>
                        <Play className="size-4 text-emerald-300" />
                        Passer en direct
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(stream.id)}>
                      <Trash2 className="size-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

"use client";

import Link from "next/link";
import {
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Play,
  Square,
  Trash2,
} from "lucide-react";

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

export default function StreamsTable({ streams, channels, onEdit, onDelete, onToggleStatus }: StreamsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-[#1b1f2a]">
          <TableRow className="border-[#262b38] hover:bg-transparent">
            <TableHead className="w-[80px] text-[#8b93a7]">ID</TableHead>
            <TableHead className="text-[#8b93a7]">Flux</TableHead>
            <TableHead className="w-[150px] text-[#8b93a7]">Statut</TableHead>
            <TableHead className="w-[220px] text-[#8b93a7]">Chaine</TableHead>
            <TableHead className="w-[120px] text-right text-[#8b93a7]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {streams.map((stream) => (
            <TableRow key={stream.id} className="border-[#262b38] hover:bg-white/[0.03]">
              <TableCell className="font-mono text-xs text-[#8b93a7]">{stream.id.slice(0, 6)}</TableCell>

              <TableCell>
                <div className="space-y-1">
                  <Link
                    href={`/streams/${stream.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#e6eaf2] hover:text-[#4c82fb]"
                  >
                    {stream.title}
                    <ExternalLink className="size-3.5" />
                  </Link>
                  <p className="max-w-[520px] truncate font-mono text-xs text-[#8b93a7]">{stream.hlsUrl}</p>
                </div>
              </TableCell>

              <TableCell>
                <StatusBadge status={stream.status} />
              </TableCell>

              <TableCell className="text-sm text-[#e6eaf2]">
                {channels.find((channel) => channel.id === stream.channelId)?.name || "Non assignee"}
              </TableCell>

              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 text-[#8b93a7] hover:bg-[#1b1f2a] hover:text-[#e6eaf2]">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 border-[#262b38] bg-[#151821] text-[#e6eaf2]">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href={`/streams/${stream.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(stream)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Configurer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#262b38]" />
                    <DropdownMenuItem onClick={() => onToggleStatus(stream, "LIVE")}>
                      <Play className="mr-2 h-4 w-4 text-[#22c55e]" />
                      Passer live
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleStatus(stream, "OFFLINE")}>
                      <Square className="mr-2 h-4 w-4 text-[#f59e0b]" />
                      Couper
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#262b38]" />
                    <DropdownMenuItem
                      onClick={() => onDelete(stream.id)}
                      className="text-[#ef4444] focus:text-[#ef4444]"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

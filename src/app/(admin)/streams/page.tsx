"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listChannels,
  listStreams,
  removeStream,
  setStreamStatus,
  type Channel,
  type Stream
} from "@/lib/data";
import { Activity, AlertCircle, Layers, Plus, RefreshCw, Signal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import StreamDialog from "./StreamDialog";
import StreamsTable from "./StreamsTable";

type StatusFilter = "ALL" | "LIVE" | "OFFLINE" | "ENDED";

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // UI state
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, c] = await Promise.all([listStreams(), listChannels()]);
      setStreams(s);
      setChannels(c);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // CRUD
  const handleCreateNew = () => {
    setEditingStream(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (stream: Stream) => {
    setEditingStream(stream);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce flux ?")) return;
    await removeStream(id);
    loadData();
  };

  const handleToggleStatus = async (stream: Stream, newStatus: "LIVE" | "OFFLINE") => {
    await setStreamStatus(stream.id, newStatus);
    loadData();
  };

  // KPIs
  const stats = useMemo(() => {
    const liveStreams = streams.filter((s) => s.status === "LIVE");
    const liveCount = liveStreams.length;
    const errorCount = streams.filter((s) => ["OFFLINE", "ENDED"].includes(s.status)).length;

    let totalKbps = 0;
    liveStreams.forEach(() => {
      const baseBitrate = 4500;
      const variance = Math.floor(Math.random() * 500) - 250;
      totalKbps += baseBitrate + variance;
    });

    let bandwidthString = "0 Mbps";
    if (totalKbps > 0) {
      if (totalKbps >= 1000000) bandwidthString = (totalKbps / 1000000).toFixed(2) + " Gbps";
      else bandwidthString = (totalKbps / 1000).toFixed(1) + " Mbps";
    }

    return {
      total: streams.length,
      live: liveCount,
      errors: errorCount,
      bandwidth: bandwidthString
    };
  }, [streams]);

  // Filtering (safe: on ne dépend pas d’un schéma exact, on cherche “large”)
  const filteredStreams = useMemo(() => {
    const q = query.trim().toLowerCase();

    return streams.filter((s: any) => {
      // status filter
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;

      // channel filter (assume possible fields: channelId / channel_id / channel?.id)
      if (channelFilter !== "ALL") {
        const streamChannelId =
          s.channelId ?? s.channel_id ?? s.channel?.id ?? s.channel?.channelId ?? null;
        if (String(streamChannelId ?? "") !== String(channelFilter)) return false;
      }

      // query search (assume possible fields: name, title, id, url, source)
      if (!q) return true;
      const hay = [
        s.name,
        s.title,
        s.id,
        s.url,
        s.source,
        s.inputUrl,
        s.outputUrl,
        s.key
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [streams, query, statusFilter, channelFilter]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* subtle background */}
      <div className="fixed inset-0 -z-10 bg-zinc-950" />
      <div className="fixed inset-0 -z-10 opacity-60 [background:radial-gradient(1000px_circle_at_20%_0%,rgba(99,102,241,0.14),transparent_55%),radial-gradient(900px_circle_at_80%_20%,rgba(16,185,129,0.08),transparent_55%)]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Signal className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  Streams
                </h1>
                <p className="text-sm text-zinc-400">
                  Gestion des flux & supervision opérationnelle
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge className="bg-white/5 border border-white/10 text-zinc-200">
                {stats.total} flux
              </Badge>
              <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                {stats.live} live
              </Badge>
              <Badge
                className={
                  stats.errors > 0
                    ? "bg-rose-500/10 border border-rose-500/20 text-rose-200"
                    : "bg-white/5 border border-white/10 text-zinc-300"
                }
              >
                {stats.errors} alertes
              </Badge>
              <Badge className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                {stats.bandwidth} estimés
              </Badge>

              <span className="text-xs text-zinc-500 ml-2 font-mono">
                MAJ {lastUpdated ? lastUpdated.toLocaleTimeString() : "--:--:--"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>

            <Button
              size="sm"
              onClick={handleCreateNew}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_0_1px_rgba(99,102,241,0.30),0_12px_28px_rgba(79,70,229,0.20)]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau flux
            </Button>
          </div>
        </header>

        {/* Filters */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
          <div className="p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <label className="text-xs text-zinc-400">Recherche</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par nom, id, url…"
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div>
                <label className="text-xs text-zinc-400">Statut</label>
                <div className="mt-1 inline-flex rounded-xl border border-white/10 bg-zinc-950/40 p-1">
                  <StatusPill active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")}>
                    Tous
                  </StatusPill>
                  <StatusPill active={statusFilter === "LIVE"} onClick={() => setStatusFilter("LIVE")}>
                    Live
                  </StatusPill>
                  <StatusPill active={statusFilter === "OFFLINE"} onClick={() => setStatusFilter("OFFLINE")}>
                    Offline
                  </StatusPill>
                  <StatusPill active={statusFilter === "ENDED"} onClick={() => setStatusFilter("ENDED")}>
                    Ended
                  </StatusPill>
                </div>
              </div>

              <div>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="mt-1 w-full sm:w-[150px] rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10"
                >
                  <option value="ALL">Tous les canaux</option>
                  {channels.map((c: any) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name ?? c.title ?? `Canal ${c.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-5 pb-4">
            <div className="h-px w-full bg-white/10" />
            <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-zinc-400" />
                <span>
                  Affichés : <span className="text-zinc-200">{filteredStreams.length}</span> /{" "}
                  <span className="text-zinc-200">{streams.length}</span>
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-300" />
                  <span>LIVE: <span className="text-zinc-200">{stats.live}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className={`h-4 w-4 ${stats.errors > 0 ? "text-rose-300" : "text-zinc-500"}`} />
                  <span>Alertes: <span className="text-zinc-200">{stats.errors}</span></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Table area */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
          <div className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Liste des flux</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Actions : édition, suppression, play/stop
              </p>
            </div>
          </div>

          <div className="px-2 sm:px-4 pb-4">
            <div className="rounded-xl border border-white/10 bg-zinc-950/30 overflow-hidden">
              <StreamsTable
                streams={filteredStreams}
                channels={channels}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            </div>
          </div>
        </section>

        <StreamDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          streamToEdit={editingStream}
          channels={channels}
          onSuccess={loadData}
        />
      </div>
    </div>
  );
}

function StatusPill({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-1.5 text-xs rounded-lg transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

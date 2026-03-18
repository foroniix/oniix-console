"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RadioTower, RefreshCw, TriangleAlert, Tv2 } from "lucide-react";

import { DataTableShell } from "@/components/console/data-table-shell";
import { FilterBar } from "@/components/console/filter-bar";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listChannels,
  listStreams,
  removeStream,
  setStreamStatus,
  type Channel,
  type Stream,
} from "@/lib/data";

import StreamDialog from "./StreamDialog";
import StreamsTable from "./StreamsTable";

type StatusFilter = "ALL" | "LIVE" | "OFFLINE" | "ENDED";

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Tous" },
  { value: "LIVE", label: "En direct" },
  { value: "OFFLINE", label: "Hors ligne" },
  { value: "ENDED", label: "Terminé" },
];

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");

  const loadData = async (soft = false) => {
    if (!soft) setIsLoading(true);
    setLoadError(null);
    try {
      const [streamRows, channelRows] = await Promise.all([listStreams(), listChannels()]);
      setStreams(streamRows);
      setChannels(channelRows);
      setLastUpdated(new Date());
    } catch {
      setLoadError("Impossible de charger les flux. Vérifiez la connexion puis réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData(false);
  }, []);

  const handleCreateNew = () => {
    setEditingStream(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (stream: Stream) => {
    setEditingStream(stream);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce flux ? Cette action est irréversible.")) return;
    await removeStream(id);
    await loadData(true);
  };

  const handleToggleStatus = async (stream: Stream, newStatus: "LIVE" | "OFFLINE") => {
    await setStreamStatus(stream.id, newStatus);
    await loadData(true);
  };

  const stats = useMemo(() => {
    const live = streams.filter((stream) => stream.status === "LIVE").length;
    const alerts = streams.filter((stream) => stream.status === "OFFLINE" || stream.status === "ENDED").length;
    return {
      total: streams.length,
      live,
      alerts,
      updatedAt: lastUpdated ? lastUpdated.toLocaleTimeString() : "--:--",
    };
  }, [lastUpdated, streams]);

  const filteredStreams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return streams.filter((stream) => {
      if (statusFilter !== "ALL" && stream.status !== statusFilter) return false;
      if (channelFilter !== "ALL" && String(stream.channelId ?? "") !== String(channelFilter)) return false;
      if (!normalizedQuery) return true;
      const haystack = [stream.id, stream.title, stream.hlsUrl, stream.description ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [channelFilter, query, statusFilter, streams]);

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("ALL");
    setChannelFilter("ALL");
  };

  return (
    <PageShell>
      <PageHeader
        title="Directs"
        subtitle="Surveillez, lancez et qualifiez vos flux HLS depuis un cockpit unique."
        breadcrumbs={[
          { label: "Oniix Console", href: "/dashboard" },
          { label: "Directs" },
        ]}
        icon={<RadioTower className="size-5" />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void loadData(true)}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
            >
              <RefreshCw className={`mr-2 size-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button onClick={handleCreateNew} className="bg-[#4c82fb] text-white hover:bg-[#3b6fe0]">
              <Plus className="mr-2 size-4" />
              Nouveau flux
            </Button>
          </>
        }
      />

      <KpiRow>
        <KpiCard label="Flux total" value={stats.total} icon={<Tv2 className="size-4" />} loading={isLoading} />
        <KpiCard
          label="Flux live"
          value={stats.live}
          tone="success"
          icon={<RadioTower className="size-4" />}
          loading={isLoading}
        />
        <KpiCard
          label="Alertes"
          value={stats.alerts}
          tone={stats.alerts > 0 ? "warning" : "neutral"}
          icon={<TriangleAlert className="size-4" />}
          hint={stats.alerts > 0 ? "Au moins un flux demande une action opérateur." : "Aucune alerte active."}
          loading={isLoading}
        />
        <KpiCard
          label="Dernière synchro"
          value={stats.updatedAt}
          tone="info"
          hint="Lecture manuelle pour garder la console réactive."
          loading={isLoading}
        />
      </KpiRow>

      <FilterBar
        onReset={resetFilters}
        resetDisabled={!query && statusFilter === "ALL" && channelFilter === "ALL"}
      >
        <div className="min-w-[220px] flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un flux (nom, ID, URL)"
            className="border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
          />
        </div>

        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-full border-slate-200 bg-white text-slate-700 sm:w-[220px] dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
            <SelectValue placeholder="Toutes les chaînes" />
          </SelectTrigger>
          <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
            <SelectItem value="ALL">Toutes les chaînes</SelectItem>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={String(channel.id)}>
                {channel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="inline-flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              className={
                statusFilter === filter.value
                  ? "border-sky-300/70 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300"
                  : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
              }
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </FilterBar>

      <DataTableShell
        title="Liste des flux"
        description={`${filteredStreams.length} résultat(s) sur ${streams.length} flux.`}
        loading={isLoading}
        error={loadError}
        onRetry={() => void loadData(false)}
        isEmpty={!isLoading && !loadError && filteredStreams.length === 0}
        emptyTitle="Aucun flux trouvé"
        emptyDescription="Ajustez les filtres ou ouvrez votre premier direct HLS."
        emptyAction={
          <Button onClick={handleCreateNew} className="mt-2 bg-[#4c82fb] text-white hover:bg-[#3b6fe0]">
            <Plus className="mr-2 size-4" />
            Créer votre premier direct
          </Button>
        }
      >
        <StreamsTable
          streams={filteredStreams}
          channels={channels}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      </DataTableShell>

      <StreamDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        streamToEdit={editingStream}
        channels={channels}
        onSuccess={() => void loadData(true)}
      />
    </PageShell>
  );
}

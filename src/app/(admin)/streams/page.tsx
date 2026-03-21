"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RadioTower, RefreshCw, TriangleAlert, Tv2 } from "lucide-react";

import { DataTableShell } from "@/components/console/data-table-shell";
import { FilterBar } from "@/components/console/filter-bar";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listChannels, listStreams, removeStream, setStreamStatus, type Channel, type Stream } from "@/lib/data";

import StreamDialog from "./StreamDialog";
import StreamsTable from "./StreamsTable";

type StatusFilter = "ALL" | "LIVE" | "OFFLINE" | "ENDED";

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Tous" },
  { value: "LIVE", label: "En direct" },
  { value: "OFFLINE", label: "Hors ligne" },
  { value: "ENDED", label: "Termine" },
];

function fmtTime(value: Date | null) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(value);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");

  const loadData = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);

    setLoadError(null);

    try {
      const [streamRows, channelRows] = await Promise.all([listStreams(), listChannels()]);
      setStreams(streamRows);
      setChannels(channelRows);
      setLastUpdated(new Date());
    } catch (error) {
      setLoadError(getErrorMessage(error, "Impossible de charger les flux. Verifiez la connexion puis reessayez."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const stats = useMemo(() => {
    const live = streams.filter((stream) => stream.status === "LIVE").length;
    const alerts = streams.filter((stream) => stream.status === "OFFLINE" || stream.status === "ENDED").length;
    return { total: streams.length, live, alerts, updatedAt: fmtTime(lastUpdated) };
  }, [lastUpdated, streams]);

  const filteredStreams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return streams.filter((stream) => {
      if (statusFilter !== "ALL" && stream.status !== statusFilter) return false;
      if (channelFilter !== "ALL" && String(stream.channelId ?? "") !== channelFilter) return false;
      if (!normalizedQuery) return true;

      const haystack = [stream.id, stream.title, stream.hlsUrl, stream.description ?? ""].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [channelFilter, query, statusFilter, streams]);

  const handleCreateNew = () => {
    setEditingStream(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (stream: Stream) => {
    setEditingStream(stream);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce flux ? Cette action est irreversible.")) return;
    try {
      await removeStream(id);
      await loadData(true);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Impossible de supprimer le flux."));
    }
  };

  const handleToggleStatus = async (stream: Stream, newStatus: "LIVE" | "OFFLINE") => {
    try {
      await setStreamStatus(stream.id, newStatus);
      await loadData(true);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Impossible de modifier le statut du flux."));
    }
  };

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
        breadcrumbs={[{ label: "Oniix Console", href: "/dashboard" }, { label: "Directs" }]}
        icon={<RadioTower className="size-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => void loadData(true)}>
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="size-4" />
              Nouveau flux
            </Button>
          </>
        }
      />

      <KpiRow>
        <KpiCard label="Flux total" value={stats.total} icon={<Tv2 className="size-4" />} loading={loading} />
        <KpiCard label="Flux live" value={stats.live} tone="success" icon={<RadioTower className="size-4" />} loading={loading} />
        <KpiCard label="Alertes" value={stats.alerts} tone={stats.alerts > 0 ? "warning" : "neutral"} icon={<TriangleAlert className="size-4" />} hint={stats.alerts > 0 ? "Au moins un flux demande une action operateur." : "Aucune alerte active."} loading={loading} />
        <KpiCard label="Derniere synchro" value={stats.updatedAt} tone="info" hint="Lecture manuelle pour garder la console reactive." loading={loading} />
      </KpiRow>

      <FilterBar onReset={resetFilters} resetDisabled={!query && statusFilter === "ALL" && channelFilter === "ALL"}>
        <div className="min-w-[220px] flex-1">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un flux par nom, ID ou URL" />
        </div>

        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Toutes les chaines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes les chaines</SelectItem>
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
              variant={statusFilter === filter.value ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </FilterBar>

      <DataTableShell
        title="Liste des flux"
        description={`${filteredStreams.length} resultat(s) sur ${streams.length} flux.`}
        loading={loading}
        error={loadError}
        onRetry={() => void loadData(false)}
        isEmpty={!loading && !loadError && filteredStreams.length === 0}
        emptyTitle="Aucun flux trouve"
        emptyDescription="Ajustez les filtres ou ouvrez votre premier direct HLS."
        emptyAction={
          <Button onClick={handleCreateNew}>
            <Plus className="size-4" />
            Creer votre premier direct
          </Button>
        }
      >
        <StreamsTable streams={filteredStreams} channels={channels} onEdit={handleEdit} onDelete={handleDelete} onToggleStatus={handleToggleStatus} />
      </DataTableShell>

      <StreamDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} streamToEdit={editingStream} channels={channels} onSuccess={() => void loadData(true)} />
    </PageShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Film, RefreshCw } from "lucide-react";

import { DataTableShell } from "@/components/console/data-table-shell";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Series {
  id: string;
  title: string;
  description?: string;
  poster_url?: string;
  published: boolean;
}

export default function AdminSeriesPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const response = await fetch("/admin/api/series", { cache: "no-store" });
      const payload = await response.json().catch(() => []);
      setSeries(Array.isArray(payload) ? payload : []);
    } catch {
      setError("Impossible de charger les series.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load(false);
  }, []);

  const stats = useMemo(() => {
    const published = series.filter((item) => item.published).length;
    return {
      total: series.length,
      published,
      draft: Math.max(0, series.length - published),
    };
  }, [series]);

  return (
    <PageShell>
      <PageHeader
        title="Series"
        subtitle="Catalogue editorial des series, statut de publication et lisibilite du portefeuille."
        breadcrumbs={[{ label: "Oniix Console", href: "/dashboard" }, { label: "Series" }]}
        icon={<Film className="size-5" />}
        actions={
          <Button variant="outline" onClick={() => void load(true)}>
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        }
      />

      <KpiRow>
        <KpiCard label="Series total" value={stats.total} hint="Nombre de fiches presentes dans le catalogue." icon={<Film className="size-4" />} loading={loading} />
        <KpiCard label="Publiees" value={stats.published} hint="Series visibles dans le parcours de diffusion." tone="success" icon={<RefreshCw className="size-4" />} loading={loading} />
        <KpiCard label="Brouillons" value={stats.draft} hint="Fiches encore en preparation editoriale." tone="warning" icon={<Film className="size-4" />} loading={loading} />
        <KpiCard label="Couverture" value={stats.total > 0 ? `${Math.round((stats.published / stats.total) * 100)}%` : "0%"} hint="Taux actuel de publication du catalogue." tone="info" icon={<Film className="size-4" />} loading={loading} />
      </KpiRow>

      <DataTableShell
        title="Catalogue series"
        description={`${series.length} serie(s) suivie(s).`}
        loading={loading}
        error={error}
        onRetry={() => void load(false)}
        isEmpty={!loading && !error && series.length === 0}
        emptyTitle="Aucune serie"
        emptyDescription="Le catalogue series est encore vide."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Publication</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-white">{item.title}</TableCell>
                <TableCell className="text-slate-300">{item.description?.trim() || "Aucune description"}</TableCell>
                <TableCell>
                  {item.published ? (
                    <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200">Publiee</Badge>
                  ) : (
                    <Badge variant="secondary">Brouillon</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
    </PageShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Film } from "lucide-react";

import { DataTableShell } from "@/components/console/data-table-shell";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Badge } from "@/components/ui/badge";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/admin/api/series", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSeries(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger les séries.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Séries"
        subtitle="Catalogue éditorial des séries et état de publication."
        breadcrumbs={[
          { label: "Oniix Console", href: "/dashboard" },
          { label: "Séries" },
        ]}
        icon={<Film className="size-5" />}
      />

      <DataTableShell
        title="Catalogue séries"
        description={`${series.length} série(s) suivie(s).`}
        loading={loading}
        error={error}
        isEmpty={!loading && !error && series.length === 0}
        emptyTitle="Aucune série"
        emptyDescription="Le catalogue séries est encore vide."
      >
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200/80 dark:border-white/10">
              <TableHead>Titre</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Publication</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.map((item) => (
              <TableRow key={item.id} className="border-slate-200/80 dark:border-white/10">
                <TableCell className="font-medium text-slate-950 dark:text-white">{item.title}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-300">
                  {item.description?.trim() || "Aucune description"}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      item.published
                        ? "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                    }
                  >
                    {item.published ? "Publiée" : "Brouillon"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
    </PageShell>
  );
}

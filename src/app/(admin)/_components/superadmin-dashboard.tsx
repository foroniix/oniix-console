"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Loader2,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Users,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OverviewKpis = {
  tenants_total: number;
  tenants_active_24h: number;
  tenants_new_7d: number;
  users_total: number;
  streams_total: number;
  streams_live: number;
  channels_total: number;
  channels_missing_origin: number;
  channels_missing_tenant: number;
  events_24h: number;
  live_sessions: number;
  ingest_configured_tenants: number;
};

type OverviewResponse = {
  ok: true;
  generated_at: string;
  kpis: OverviewKpis;
  top_tenants: Array<{
    tenant_id: string;
    name: string;
    events_24h: number;
    share_pct: number;
  }>;
  recent_tenants: Array<{
    id: string;
    name: string;
    created_at: string;
    created_by: string | null;
  }>;
  warnings?: string[];
};

function numberFormat(value: number) {
  try {
    return new Intl.NumberFormat("fr-FR").format(value);
  } catch {
    return String(value);
  }
}

function dateTimeFormat(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "--";
  return new Date(parsed).toLocaleString("fr-FR");
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="group rounded-[24px] border-slate-200/80 bg-white/85 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:hover:bg-white/[0.06]">
      <CardHeader className="pb-3">
        <CardDescription className="text-slate-500 dark:text-slate-400">{title}</CardDescription>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-2xl font-bold text-slate-950 dark:text-white">{value}</CardTitle>
          <span className="inline-flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-primary dark:border-white/10 dark:bg-white/5">
            <Icon className="size-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function SuperadminDashboard() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/superadmin/overview", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as OverviewResponse | { error?: string } | null;
      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        setError((json && "error" in json && json.error) || "Impossible de charger la vue plateforme.");
        return;
      }
      setData(json);
    } catch {
      setError("Erreur reseau sur la vue plateforme.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview(false);
    const timer = window.setInterval(() => {
      fetchOverview(true);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [fetchOverview]);

  const kpis = data?.kpis;
  const ingestCoverage = useMemo(() => {
    if (!kpis || kpis.tenants_total <= 0) return 0;
    return Math.round((kpis.ingest_configured_tenants / kpis.tenants_total) * 100);
  }, [kpis]);
  const readyChannels = useMemo(() => {
    if (!kpis) return 0;
    return Math.max(0, kpis.channels_total - kpis.channels_missing_origin);
  }, [kpis]);
  const channelsCoverage = useMemo(() => {
    if (!kpis || kpis.channels_total <= 0) return 0;
    return Math.round((readyChannels / kpis.channels_total) * 100);
  }, [kpis, readyChannels]);

  const warnings = data?.warnings ?? [];

  return (
    <div className="console-page lg:space-y-7">
      <header className="console-hero flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">Pilotage groupe Oniix</h1>
            <Badge className="border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
              Multi-editeur
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Vision consolidee des editeurs, de la diffusion live, de l&apos;adoption et de la qualite d&apos;exploitation.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Derniere synchro : {data?.generated_at ? dateTimeFormat(data.generated_at) : "--"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => fetchOverview(true)} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button asChild>
            <Link href="/tenants">
              Gerer les editeurs
              <ArrowUpRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {error ? (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="p-4 text-sm text-rose-200">{error}</CardContent>
        </Card>
      ) : null}

      {warnings.length > 0 ? (
        <Card className="border-amber-500/25 bg-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-200">Points de remediation</CardTitle>
            <CardDescription className="text-amber-200/80">
              Certaines briques d&apos;exploitation restent incompletes a l&apos;echelle groupe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-amber-100">
            {warnings.map((warning) => (
              <p key={warning}>- {warning}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {kpis && (kpis.channels_missing_origin > 0 || kpis.channels_missing_tenant > 0) ? (
        <Card className="border-amber-500/25 bg-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-200">Remediation catalogue requise</CardTitle>
            <CardDescription className="text-amber-200/80">
              La gateway Oniix restera partiellement indisponible tant que ces champs ne sont pas alignes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm text-amber-100">
              <p>{numberFormat(kpis.channels_missing_origin)} chaine(s) sans URL HLS d&apos;origine.</p>
              <p>{numberFormat(kpis.channels_missing_tenant)} chaine(s) sans rattachement editeur.</p>
            </div>
            <Button asChild variant="outline" className="border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20">
              <Link href="/system/channel-backfill">
                Ouvrir la remediation
                <ArrowUpRight className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Editeurs"
          value={loading && !data ? "..." : numberFormat(kpis?.tenants_total ?? 0)}
          subtitle={`${numberFormat(kpis?.tenants_new_7d ?? 0)} nouveaux / 7 jours`}
          icon={Building2}
        />
        <MetricCard
          title="Editeurs actifs (24 h)"
          value={loading && !data ? "..." : numberFormat(kpis?.tenants_active_24h ?? 0)}
          subtitle="Espaces ayant reellement produit du trafic"
          icon={BadgeCheck}
        />
        <MetricCard
          title="Utilisateurs plateforme"
          value={loading && !data ? "..." : numberFormat(kpis?.users_total ?? 0)}
          subtitle="Comptes consolides sur l'ensemble du groupe"
          icon={Users}
        />
        <MetricCard
          title="Signaux analytics 24 h"
          value={loading && !data ? "..." : numberFormat(kpis?.events_24h ?? 0)}
          subtitle={`${numberFormat(kpis?.live_sessions ?? 0)} sessions live dans la fenetre glissante`}
          icon={Activity}
        />
        <MetricCard
          title="Directs actifs"
          value={
            loading && !data
              ? "..."
              : `${numberFormat(kpis?.streams_live ?? 0)} / ${numberFormat(kpis?.streams_total ?? 0)}`
          }
          subtitle="Occupation live du parc de diffusion"
          icon={RadioTower}
        />
        <MetricCard
          title="Couverture ingest"
          value={loading && !data ? "..." : `${ingestCoverage}%`}
          subtitle={`${numberFormat(kpis?.ingest_configured_tenants ?? 0)} editeurs configures`}
          icon={ShieldCheck}
        />
        <MetricCard
          title="Chaines OTT pretes"
          value={loading && !data ? "..." : `${channelsCoverage}%`}
          subtitle={`${numberFormat(readyChannels)} / ${numberFormat(kpis?.channels_total ?? 0)} avec origine`}
          icon={RadioTower}
        />
        <MetricCard
          title="Sessions en direct"
          value={loading && !data ? "..." : numberFormat(kpis?.live_sessions ?? 0)}
          subtitle="Photographie operateur sur fenetre glissante"
          icon={Waves}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Top editeurs par activite</CardTitle>
            <CardDescription>Classement groupe par volume de signaux sur 24 h.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <div className="flex min-h-[220px] items-center justify-center text-zinc-500">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Chargement...
              </div>
            ) : data && data.top_tenants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Editeur</TableHead>
                    <TableHead className="text-right">Evenements 24h</TableHead>
                    <TableHead className="text-right">Part</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top_tenants.map((tenant) => (
                    <TableRow key={tenant.tenant_id}>
                      <TableCell className="font-medium text-white">{tenant.name}</TableCell>
                      <TableCell className="text-right">{numberFormat(tenant.events_24h)}</TableCell>
                      <TableCell className="text-right">{tenant.share_pct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-500">
                Aucune activite analytics exploitable pour le moment.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5 xl:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Mises en service recentes</CardTitle>
              <CardDescription>Derniers editeurs actives sur la plateforme.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && !data ? (
                <div className="flex min-h-[140px] items-center justify-center text-zinc-500">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Chargement...
                </div>
              ) : data && data.recent_tenants.length > 0 ? (
                data.recent_tenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
                  >
                    <p className="text-sm font-semibold text-white">{tenant.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">Cree le {dateTimeFormat(tenant.created_at)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-500">
                  Aucun editeur recent.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Gouvernance plateforme</CardTitle>
              <CardDescription>Raccourcis d&apos;administration groupe et d&apos;exploitation.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline" className="justify-between">
                <Link href="/tenants">
                  Portefeuille editeurs
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/users">
                  Equipe plateforme
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/system">
                  Exploitation systeme
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

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
    <Card className="group border-white/10 bg-white/[0.03] transition-colors hover:bg-white/[0.05]">
      <CardHeader className="pb-3">
        <CardDescription className="text-zinc-400">{title}</CardDescription>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-2xl font-bold text-white">{value}</CardTitle>
          <span className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-primary">
            <Icon className="size-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-zinc-500">{subtitle}</p>
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

  const warnings = data?.warnings ?? [];

  return (
    <div className="space-y-6 lg:space-y-7">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-transparent to-primary/10 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Superadmin SaaS Cockpit</h1>
            <Badge className="border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20">
              Multi-tenant
            </Badge>
          </div>
          <p className="text-sm text-zinc-400">
            Pilotage global des editeurs TV, audience live, sante plateforme et adoption SaaS.
          </p>
          <p className="text-xs text-zinc-500">
            Derniere sync: {data?.generated_at ? dateTimeFormat(data.generated_at) : "--"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => fetchOverview(true)}>
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Rafraichir
          </Button>
          <Button asChild>
            <Link href="/tenants">
              Gerer les tenants
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
            <CardTitle className="text-sm text-amber-200">Points a corriger</CardTitle>
            <CardDescription className="text-amber-200/80">
              Certaines briques SaaS ne sont pas encore completement provisionnees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-amber-100">
            {warnings.map((warning) => (
              <p key={warning}>- {warning}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Tenants total"
          value={loading && !data ? "..." : numberFormat(kpis?.tenants_total ?? 0)}
          subtitle={`${numberFormat(kpis?.tenants_new_7d ?? 0)} nouveaux / 7 jours`}
          icon={Building2}
        />
        <MetricCard
          title="Tenants actifs (24h)"
          value={loading && !data ? "..." : numberFormat(kpis?.tenants_active_24h ?? 0)}
          subtitle="Base active sur la derniere journee"
          icon={BadgeCheck}
        />
        <MetricCard
          title="Utilisateurs plateforme"
          value={loading && !data ? "..." : numberFormat(kpis?.users_total ?? 0)}
          subtitle="Comptes consolides tout tenant"
          icon={Users}
        />
        <MetricCard
          title="Events analytics 24h"
          value={loading && !data ? "..." : numberFormat(kpis?.events_24h ?? 0)}
          subtitle={`${numberFormat(kpis?.live_sessions ?? 0)} sessions live (~35s)`}
          icon={Activity}
        />
        <MetricCard
          title="Streams live"
          value={
            loading && !data
              ? "..."
              : `${numberFormat(kpis?.streams_live ?? 0)} / ${numberFormat(kpis?.streams_total ?? 0)}`
          }
          subtitle="Occupation live du parc streams"
          icon={RadioTower}
        />
        <MetricCard
          title="Couverture ingest"
          value={loading && !data ? "..." : `${ingestCoverage}%`}
          subtitle={`${numberFormat(kpis?.ingest_configured_tenants ?? 0)} tenants configures`}
          icon={ShieldCheck}
        />
        <MetricCard
          title="Sessions live"
          value={loading && !data ? "..." : numberFormat(kpis?.live_sessions ?? 0)}
          subtitle="Snapshot fenetre glissante"
          icon={Waves}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Top tenants par activite</CardTitle>
            <CardDescription>Classement plateforme par volume d&apos;evenements sur 24h.</CardDescription>
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
                    <TableHead>Tenant</TableHead>
                    <TableHead className="text-right">Events 24h</TableHead>
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
              <CardTitle>Onboarding recent</CardTitle>
              <CardDescription>Derniers tenants provisionnes sur la plateforme.</CardDescription>
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
                  Aucun tenant recent.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Actions SaaS</CardTitle>
              <CardDescription>Raccourcis de gouvernance plateforme.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline" className="justify-between">
                <Link href="/tenants">
                  Portfolio tenants
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/users">
                  IAM global
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/system">
                  Sante systeme
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

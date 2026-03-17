"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck, Siren, Waves } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type OverviewKpis = {
  tenants_total: number;
  tenants_active_24h: number;
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
  warnings?: string[];
};

function numberFormat(value: number) {
  try {
    return new Intl.NumberFormat("fr-FR").format(value);
  } catch {
    return String(value);
  }
}

export default function SystemPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);

    setError("");
    try {
      const res = await fetch("/api/superadmin/overview", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as OverviewResponse | { error?: string } | null;
      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        setError((json && "error" in json && json.error) || "Impossible de charger la santé plateforme.");
        return;
      }

      setData(json);
    } catch {
      setError("Erreur réseau sur la santé plateforme.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const timer = window.setInterval(() => {
      void load(true);
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [load]);

  const ingestCoverage = useMemo(() => {
    if (!data?.kpis.tenants_total) return 0;
    return Math.round((data.kpis.ingest_configured_tenants / data.kpis.tenants_total) * 100);
  }, [data]);

  const activityCoverage = useMemo(() => {
    if (!data?.kpis.tenants_total) return 0;
    return Math.round((data.kpis.tenants_active_24h / data.kpis.tenants_total) * 100);
  }, [data]);

  const streamLiveRatio = useMemo(() => {
    if (!data?.kpis.streams_total) return 0;
    return Math.round((data.kpis.streams_live / data.kpis.streams_total) * 100);
  }, [data]);

  return (
    <PageShell>
      <PageHeader
        title="Santé plateforme"
        subtitle="Observabilité et maturité d’exploitation de la plateforme SaaS multi-tenant."
        breadcrumbs={[
          { label: "Oniix Console", href: "/dashboard" },
          { label: "Système" },
        ]}
        icon={<ShieldCheck className="size-5" />}
        actions={
          <Button
            variant="outline"
            onClick={() => void load(true)}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
          >
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        }
      />

      {error ? (
        <Card className="border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
          <CardContent className="p-4 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex min-h-[240px] items-center justify-center text-slate-500 dark:text-slate-400">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Chargement de la santé...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="size-4 text-primary" />
                  Couverture ingest
                </CardTitle>
                <CardDescription>Tenants configurés pour la collecte live.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-semibold text-slate-950 dark:text-white">{ingestCoverage}%</div>
                <Progress value={ingestCoverage} />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {numberFormat(data?.kpis.ingest_configured_tenants ?? 0)} /{" "}
                  {numberFormat(data?.kpis.tenants_total ?? 0)} tenants.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Waves className="size-4 text-primary" />
                  Occupation live
                </CardTitle>
                <CardDescription>Ratio des streams actuellement en direct.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-semibold text-slate-950 dark:text-white">{streamLiveRatio}%</div>
                <Progress value={streamLiveRatio} />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {numberFormat(data?.kpis.streams_live ?? 0)} /{" "}
                  {numberFormat(data?.kpis.streams_total ?? 0)} streams.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="size-4 text-primary" />
                  Activité tenants
                </CardTitle>
                <CardDescription>Part des tenants actifs sur les dernières 24 heures.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-semibold text-slate-950 dark:text-white">{activityCoverage}%</div>
                <Progress value={activityCoverage} />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {numberFormat(data?.kpis.tenants_active_24h ?? 0)} /{" "}
                  {numberFormat(data?.kpis.tenants_total ?? 0)} tenants.
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pulse temps réel</CardTitle>
                <CardDescription>Charge actuelle de la plateforme.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="text-slate-500 dark:text-slate-400">Sessions live</span>
                  <span className="font-semibold text-slate-950 dark:text-white">
                    {numberFormat(data?.kpis.live_sessions ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="text-slate-500 dark:text-slate-400">Événements analytics 24 h</span>
                  <span className="font-semibold text-slate-950 dark:text-white">
                    {numberFormat(data?.kpis.events_24h ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="text-slate-500 dark:text-slate-400">Streams en direct</span>
                  <span className="font-semibold text-slate-950 dark:text-white">
                    {numberFormat(data?.kpis.streams_live ?? 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Siren className="size-4 text-amber-500 dark:text-amber-300" />
                  Checkpoints ops
                </CardTitle>
                <CardDescription>État des prérequis SaaS critiques.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(data?.warnings ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-emerald-300/70 bg-emerald-50 px-3 py-3 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Aucun avertissement majeur détecté.
                  </div>
                ) : (
                  (data?.warnings ?? []).map((warning) => (
                    <div
                      key={warning}
                      className="rounded-2xl border border-amber-300/70 bg-amber-50 px-3 py-3 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300"
                    >
                      {warning}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </PageShell>
  );
}

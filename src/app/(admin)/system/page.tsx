"use client";

import { useCallback, useEffect, useMemo, type ReactNode, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Siren,
  Waves,
} from "lucide-react";

import { KpiCard, KpiRow } from "@/components/console/kpi";
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

type CoverageBlockProps = {
  label: string;
  description: string;
  value: number;
  numerator: number;
  denominator: number;
  icon: ReactNode;
};

function numberFormat(value: number) {
  try {
    return new Intl.NumberFormat("fr-FR").format(value);
  } catch {
    return String(value);
  }
}

function dateTimeFormat(value: string | null | undefined) {
  if (!value) return "--";

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "--";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function CoverageBlock({ label, description, value, numerator, denominator, icon }: CoverageBlockProps) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        <span className="inline-flex size-10 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] text-slate-200">
          {icon}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-end justify-between gap-4">
          <p className="text-3xl font-semibold text-white">{value}%</p>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            {numberFormat(numerator)} / {numberFormat(denominator)}
          </p>
        </div>
        <Progress value={value} className="h-2.5 bg-white/[0.06]" />
      </div>
    </div>
  );
}

function MetricRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
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
      const response = await fetch("/api/superadmin/overview", { cache: "no-store" });
      const json = (await response.json().catch(() => null)) as OverviewResponse | { error?: string } | null;

      if (!response.ok || !json || !("ok" in json) || !json.ok) {
        setError((json && "error" in json && json.error) || "Impossible de charger la sante plateforme.");
        return;
      }

      setData(json);
    } catch {
      setError("Erreur reseau sur la sante plateforme.");
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

  const warnings = data?.warnings ?? [];

  return (
    <PageShell>
      <PageHeader
        title="Exploitation systeme"
        subtitle="Surveillez la couverture, la charge et les alertes de la plateforme depuis un point de controle unique."
        breadcrumbs={[{ label: "Oniix Console", href: "/dashboard" }, { label: "Systeme" }]}
        icon={<ShieldCheck className="size-5" />}
        actions={
          <Button variant="outline" onClick={() => void load(true)}>
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        }
      />

      {error ? (
        <section className="console-panel flex items-start gap-3 border-rose-500/20 bg-rose-500/10 px-5 py-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[18px] border border-rose-500/20 bg-rose-500/14 text-rose-200">
            <AlertTriangle className="size-4" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-rose-100">Incident de chargement</p>
            <p className="text-sm text-rose-200/80">{error}</p>
          </div>
        </section>
      ) : null}

      <KpiRow>
        <KpiCard
          label="Editeurs actifs 24h"
          value={numberFormat(data?.kpis.tenants_active_24h ?? 0)}
          hint={`${activityCoverage}% du parc a emet du trafic recent.`}
          tone="success"
          icon={<Building2 className="size-4" />}
          loading={loading}
        />
        <KpiCard
          label="Flux en direct"
          value={numberFormat(data?.kpis.streams_live ?? 0)}
          hint={`${streamLiveRatio}% des flux sont actuellement ouverts.`}
          tone="info"
          icon={<RadioTower className="size-4" />}
          loading={loading}
        />
        <KpiCard
          label="Sessions live"
          value={numberFormat(data?.kpis.live_sessions ?? 0)}
          hint="Charge instantanee observee sur la plateforme."
          icon={<Waves className="size-4" />}
          loading={loading}
        />
        <KpiCard
          label="Evenements 24h"
          value={numberFormat(data?.kpis.events_24h ?? 0)}
          hint={`Derniere synchro ${dateTimeFormat(data?.generated_at)}`}
          tone="warning"
          icon={<Activity className="size-4" />}
          loading={loading}
        />
      </KpiRow>

      {loading && !data ? (
        <Card>
          <CardContent className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" />
            Chargement du cockpit systeme...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Card>
              <CardHeader>
                <CardTitle>Couverture operationnelle</CardTitle>
                <CardDescription>
                  Trois lectures pour verifier si le parc est correctement relie a l&apos;ingest, actif et exploitable.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <CoverageBlock
                  label="Couverture ingest"
                  description="Editeurs relies a la collecte live."
                  value={ingestCoverage}
                  numerator={data?.kpis.ingest_configured_tenants ?? 0}
                  denominator={data?.kpis.tenants_total ?? 0}
                  icon={<ShieldCheck className="size-4" />}
                />
                <CoverageBlock
                  label="Activite editeurs"
                  description="Part des editeurs actifs sur les dernieres 24 heures."
                  value={activityCoverage}
                  numerator={data?.kpis.tenants_active_24h ?? 0}
                  denominator={data?.kpis.tenants_total ?? 0}
                  icon={<Building2 className="size-4" />}
                />
                <CoverageBlock
                  label="Occupation live"
                  description="Ratio des flux actifs par rapport au portefeuille total."
                  value={streamLiveRatio}
                  numerator={data?.kpis.streams_live ?? 0}
                  denominator={data?.kpis.streams_total ?? 0}
                  icon={<RadioTower className="size-4" />}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pulse temps reel</CardTitle>
                <CardDescription>Mesures de charge et de trafic suivies par les operations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <MetricRow
                  label="Sessions live"
                  value={numberFormat(data?.kpis.live_sessions ?? 0)}
                  hint="Sessions de lecture ou de supervision actives."
                />
                <MetricRow
                  label="Flux ouverts"
                  value={numberFormat(data?.kpis.streams_live ?? 0)}
                  hint="Flux passes en direct a cet instant."
                />
                <MetricRow
                  label="Evenements analytics"
                  value={numberFormat(data?.kpis.events_24h ?? 0)}
                  hint="Volume agrégé sur les dernieres 24 heures."
                />
                <MetricRow
                  label="Parc editeurs"
                  value={numberFormat(data?.kpis.tenants_total ?? 0)}
                  hint="Base de reference pour la couverture operationnelle."
                />
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Siren className="size-4 text-amber-300" />
                Checkpoints d&apos;exploitation
              </CardTitle>
              <CardDescription>
                Alertes structurelles et prerequis critiques detectes lors de la derniere remontee.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {warnings.length === 0 ? (
                <div className="flex items-start gap-3 rounded-[24px] border border-emerald-400/18 bg-emerald-500/10 px-4 py-4">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[18px] border border-emerald-400/20 bg-emerald-500/14 text-emerald-100">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-emerald-50">Aucune alerte majeure</p>
                    <p className="text-sm text-emerald-100/75">Les prerequis critiques suivis par le cockpit sont au vert.</p>
                  </div>
                </div>
              ) : (
                warnings.map((warning) => (
                  <div key={warning} className="flex items-start gap-3 rounded-[24px] border border-amber-400/18 bg-amber-500/10 px-4 py-4">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[18px] border border-amber-400/20 bg-amber-500/14 text-amber-100">
                      <AlertTriangle className="size-4" />
                    </span>
                    <p className="pt-1 text-sm text-amber-50">{warning}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck, Siren, Waves } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
    load(false);
    const timer = window.setInterval(() => load(true), 30000);
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
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-transparent to-primary/10 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">System Health</h1>
            <Badge className="border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
              Platform Ops
            </Badge>
          </div>
          <p className="text-sm text-zinc-400">
            Observabilite et maturite de la plateforme SaaS multi-tenant.
          </p>
        </div>

        <Button variant="outline" onClick={() => load(true)}>
          <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
          Rafraichir
        </Button>
      </header>

      {error ? (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="p-4 text-sm text-rose-200">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex min-h-[240px] items-center justify-center text-zinc-500">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Chargement de la sante...
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
                <CardDescription>Tenants configures pour la collecte live.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-semibold text-white">{ingestCoverage}%</div>
                <Progress value={ingestCoverage} />
                <p className="text-xs text-zinc-500">
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
                <CardDescription>Ratio streams actuellement en LIVE.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-semibold text-white">{streamLiveRatio}%</div>
                <Progress value={streamLiveRatio} />
                <p className="text-xs text-zinc-500">
                  {numberFormat(data?.kpis.streams_live ?? 0)} /{" "}
                  {numberFormat(data?.kpis.streams_total ?? 0)} streams.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="size-4 text-primary" />
                  Activite tenants
                </CardTitle>
                <CardDescription>Part des tenants actifs sur les 24h.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-semibold text-white">{activityCoverage}%</div>
                <Progress value={activityCoverage} />
                <p className="text-xs text-zinc-500">
                  {numberFormat(data?.kpis.tenants_active_24h ?? 0)} /{" "}
                  {numberFormat(data?.kpis.tenants_total ?? 0)} tenants.
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Realtime pulse</CardTitle>
                <CardDescription>Charge actuelle de la plateforme.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-zinc-400">Sessions live</span>
                  <span className="font-semibold text-white">
                    {numberFormat(data?.kpis.live_sessions ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-zinc-400">Events analytics 24h</span>
                  <span className="font-semibold text-white">
                    {numberFormat(data?.kpis.events_24h ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-zinc-400">Streams live</span>
                  <span className="font-semibold text-white">
                    {numberFormat(data?.kpis.streams_live ?? 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Siren className="size-4 text-amber-300" />
                  Checkpoints ops
                </CardTitle>
                <CardDescription>Etat des prerequis SaaS critiques.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-300">
                {(data?.warnings ?? []).length === 0 ? (
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-emerald-200">
                    Aucun warning majeur detecte.
                  </div>
                ) : (
                  (data?.warnings ?? []).map((warning) => (
                    <div
                      key={warning}
                      className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-amber-200"
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
    </div>
  );
}


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Banknote, CreditCard, Loader2, RefreshCw, TrendingUp } from "lucide-react";

import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RevenueAPIResponse = {
  ok: boolean;
  period: "24h" | "7d" | "30d";
  currency: string;
  totals: {
    totalRevenue: number;
    totalTransactions: number;
    arpu: number;
  };
  series: Array<{
    time: string;
    revenue: number;
    transactions: number;
  }>;
  breakdown?: Array<{ label: string; value: number }>;
  error?: string;
};

function safeNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function formatCurrency(value: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(safeNumber(value))} ${currency}`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("fr-FR").format(safeNumber(value));
}

export default function RevenuePage() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const [data, setData] = useState<RevenueAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);

    setErrorMsg("");

    try {
      const res = await fetch(`/api/revenue/stats?period=${period}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as RevenueAPIResponse | null;

      if (!res.ok || !json || !json.ok) {
        setData(null);
        setErrorMsg(json?.error || "Impossible de charger les revenus.");
        return;
      }

      setData(json);
    } catch (error) {
      console.error(error);
      setData(null);
      setErrorMsg("Erreur réseau pendant le chargement des revenus.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    void fetchData(false);
  }, [fetchData]);

  const normalized = useMemo(() => {
    const totals = data?.totals ?? { totalRevenue: 0, totalTransactions: 0, arpu: 0 };
    const series = Array.isArray(data?.series) ? data.series : [];
    const currency = data?.currency || "XOF";

    return {
      currency,
      totals: {
        totalRevenue: safeNumber(totals.totalRevenue),
        totalTransactions: safeNumber(totals.totalTransactions),
        arpu: safeNumber(totals.arpu),
      },
      series: series.map((point) => ({
        time: String(point?.time ?? ""),
        revenue: safeNumber(point?.revenue),
        transactions: safeNumber(point?.transactions),
      })),
      breakdown: Array.isArray(data?.breakdown)
        ? data.breakdown.map((entry) => ({
            label: String(entry?.label ?? "Sans libellé"),
            value: safeNumber(entry?.value),
          }))
        : [],
    };
  }, [data]);

  return (
    <PageShell>
      <PageHeader
        title="Revenus"
        subtitle="Suivez les revenus, le volume transactionnel et la valeur moyenne."
        breadcrumbs={[{ label: "Oniix Console", href: "/dashboard" }, { label: "Revenus" }]}
        icon={<Banknote className="size-5" />}
        actions={
          <>
            <Tabs value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
              <TabsList>
                <TabsTrigger value="24h">24H</TabsTrigger>
                <TabsTrigger value="7d">7J</TabsTrigger>
                <TabsTrigger value="30d">30J</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={() => void fetchData(true)}>
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </>
        }
      />

      {errorMsg ? (
        <section className="console-panel flex items-start gap-3 border-rose-500/20 bg-rose-500/10 px-5 py-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[18px] border border-rose-500/20 bg-rose-500/14 text-rose-100">
            <Banknote className="size-4" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-rose-100">Lecture indisponible</p>
            <p className="text-sm text-rose-100/75">{errorMsg}</p>
          </div>
        </section>
      ) : null}

      <KpiRow>
        <KpiCard
          label="Revenu total"
          value={formatCurrency(normalized.totals.totalRevenue, normalized.currency)}
          hint="Cumul consolidé sur la fenêtre sélectionnée."
          icon={<Banknote className="size-4" />}
          loading={loading && !data}
          tone="success"
        />
        <KpiCard
          label="Transactions"
          value={formatInteger(normalized.totals.totalTransactions)}
          hint="Volume total d’opérations monétisées."
          icon={<CreditCard className="size-4" />}
          loading={loading && !data}
          tone="info"
        />
        <KpiCard
          label="ARPU"
          value={formatCurrency(normalized.totals.arpu, normalized.currency)}
          hint="Valeur moyenne par utilisateur ou client actif."
          icon={<TrendingUp className="size-4" />}
          loading={loading && !data}
          tone="warning"
        />
        <KpiCard
          label="Periode"
          value={period.toUpperCase()}
          hint="Lecture actuelle du cockpit revenu."
          icon={<RefreshCw className="size-4" />}
          loading={loading && !data}
        />
      </KpiRow>

      {loading && !data ? (
        <Card>
          <CardContent className="flex min-h-[300px] items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" />
            Chargement des revenus...
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader>
              <CardTitle>Évolution du revenu</CardTitle>
              <CardDescription>
                Tendance périodique des revenus sur la fenêtre courante.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[340px] w-full">
                {normalized.series.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={normalized.series}>
                      <defs>
                        <linearGradient id="revenue-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f8fff" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4f8fff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(10,16,24,0.96)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#E2E8F0",
                          fontSize: "12px",
                          borderRadius: "18px",
                        }}
                        formatter={(value: number | string | undefined) => [
                          formatCurrency(safeNumber(value), normalized.currency),
                          "Revenu",
                        ]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#4f8fff" strokeWidth={2} fill="url(#revenue-area)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-400">
                    Aucun revenu à afficher sur la période sélectionnée.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ventilation</CardTitle>
              <CardDescription>
                Lectures complémentaires issues de l’API revenu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {normalized.breakdown.length > 0 ? (
                normalized.breakdown.map((entry) => (
                  <div key={entry.label} className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-sm text-slate-300">{entry.label}</p>
                    <p className="text-sm font-semibold text-white">{formatCurrency(entry.value, normalized.currency)}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-sm text-slate-300">Transactions monétisées</p>
                    <p className="text-sm font-semibold text-white">{formatInteger(normalized.totals.totalTransactions)}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-sm text-slate-300">Valeur moyenne</p>
                    <p className="text-sm font-semibold text-white">{formatCurrency(normalized.totals.arpu, normalized.currency)}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-sm text-slate-300">Monnaie</p>
                    <p className="text-sm font-semibold text-white">{normalized.currency}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </PageShell>
  );
}

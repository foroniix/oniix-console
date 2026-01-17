"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Banknote } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RevenueAPIResponse = {
  ok: boolean;
  period: "24h" | "7d" | "30d";
  currency: string;
  totals: {
    totalRevenue: number;
    totalTransactions: number;
    arpu: number; // average revenue per user (optionnel mais pratique)
  };
  series: Array<{
    time: string;
    revenue: number;
    transactions: number;
  }>;
  // optionnel
  breakdown?: Array<{ label: string; value: number }>;
};

function safeNumber(n: any) {
  return Number.isFinite(Number(n)) ? Number(n) : 0;
}

export default function RevenuePage() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const [data, setData] = useState<RevenueAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
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
        setErrorMsg((json as any)?.error || "Impossible de charger les revenus");
        return;
      }

      setData(json);
    } catch (e) {
      console.error(e);
      setData(null);
      setErrorMsg("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // ✅ Normalisation : plus jamais undefined
  const normalized = useMemo(() => {
    const totals = data?.totals ?? { totalRevenue: 0, totalTransactions: 0, arpu: 0 };
    const series = Array.isArray(data?.series) ? data!.series : [];
    const currency = data?.currency || "XOF";

    return {
      currency,
      totals: {
        totalRevenue: safeNumber(totals.totalRevenue),
        totalTransactions: safeNumber(totals.totalTransactions),
        arpu: safeNumber(totals.arpu),
      },
      series: series.map((p) => ({
        time: String(p?.time ?? ""),
        revenue: safeNumber(p?.revenue),
        transactions: safeNumber(p?.transactions),
      })),
    };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-xs tracking-widest">
        <Loader2 className="h-4 w-4 animate-spin mr-3 text-indigo-500" />
        Chargement des revenus...
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 p-6 bg-zinc-950 text-zinc-100">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Banknote className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Revenus</h1>
            <p className="text-xs text-zinc-500">Revenus visibles uniquement au sein de votre organisation.</p>
          </div>
        </div>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
          <TabsList className="bg-zinc-900 border border-white/5">
            <TabsTrigger value="24h">24H</TabsTrigger>
            <TabsTrigger value="7d">7J</TabsTrigger>
            <TabsTrigger value="30d">30J</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {errorMsg ? (
        <Card className="bg-zinc-900/40 border-rose-500/20">
          <CardHeader>
            <CardTitle className="text-rose-300 text-sm">Erreur</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            {errorMsg}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi title="Revenu total" value={`${normalized.totals.totalRevenue.toLocaleString()} ${normalized.currency}`} />
        <Kpi title="Transactions" value={normalized.totals.totalTransactions.toLocaleString()} />
        <Kpi title="ARPU" value={`${normalized.totals.arpu.toLocaleString()} ${normalized.currency}`} />
      </div>

      <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-white text-sm uppercase tracking-widest font-bold">
            Évolution du revenu
          </CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-[320px] w-full">
            {normalized.series.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={normalized.series}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="time" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      border: "1px solid #ffffff10",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-600 text-xs font-mono tracking-widest">
                Aucun revenu à afficher pour la période sélectionnée.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card className="bg-zinc-900/40 border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-white tracking-tighter">{value}</div>
      </CardContent>
    </Card>
  );
}

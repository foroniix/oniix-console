"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Clock,
  Loader2,
  Radio,
  RefreshCw,
  Users,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

type DashboardData = {
  live: { activeUsers: number; currentStreams: Record<string, number> };
  traffic: { time: string; viewers: number }[];
  devices?: { name: string; value: number; color?: string }[];
  kpi: { totalUsers: number; totalEvents: number; watchTime: number };
};

type RealtimeEventRow = {
  tenant_id: string;
  stream_id: string | null;
  session_id: string;
  user_id: string | null;
  event_type: "heartbeat";
  device: string | null;
  created_at: string;
};

function safeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatCompact(n: number) {
  try {
    return new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(n);
  } catch {
    return String(n);
  }
}

function formatNumber(n: number) {
  try {
    return new Intl.NumberFormat("fr-FR").format(n);
  } catch {
    return String(n);
  }
}

function formatWatchTimeMinutes(min: number) {
  const m = safeNumber(min, 0);
  if (m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}

function SkeletonLine({ w = "w-full" }: { w?: string }) {
  return <div className={`h-3 ${w} animate-pulse rounded bg-white/5`} />;
}

function MetricCard({
  title,
  value,
  sub,
  icon: Icon,
  accent = "indigo",
  loading,
}: {
  title: string;
  value: string;
  sub: string;
  icon: any;
  accent?: "indigo" | "emerald" | "rose";
  loading?: boolean;
}) {
  const ring =
    accent === "emerald"
      ? "ring-emerald-500/10 border-emerald-500/20"
      : accent === "rose"
      ? "ring-rose-500/10 border-rose-500/20"
      : "ring-indigo-500/10 border-indigo-500/20";

  const iconColor =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "rose"
      ? "text-rose-400"
      : "text-indigo-400";

  return (
    <Card className={`bg-zinc-900/40 border-white/10 backdrop-blur ring-1 ${ring}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-[11px] uppercase tracking-widest text-zinc-400">{title}</CardTitle>
            {loading ? (
              <div className="pt-1 space-y-2">
                <SkeletonLine w="w-24" />
                <SkeletonLine w="w-40" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-black tracking-tight text-white">{value}</div>
                <p className="text-xs text-zinc-500">{sub}</p>
              </>
            )}
          </div>
          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10">
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0" />
    </Card>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs text-zinc-300">
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [softRefreshing, setSoftRefreshing] = useState(false);
  const [error, setError] = useState<string>("");

  // realtime caches
  const lastSeenRef = useRef<Map<string, number>>(new Map()); // session_id -> ms
  const sessionStreamRef = useRef<Map<string, string | null>>(new Map()); // session_id -> stream_id

  const LIVE_WINDOW_MS = 45_000;

  const recomputeLive = () => {
    const now = Date.now();

    // purge old
    for (const [sid, ts] of lastSeenRef.current.entries()) {
      if (now - ts > LIVE_WINDOW_MS) {
        lastSeenRef.current.delete(sid);
        sessionStreamRef.current.delete(sid);
      }
    }

    const currentStreams: Record<string, number> = {};
    for (const sid of lastSeenRef.current.keys()) {
      const streamId = sessionStreamRef.current.get(sid);
      if (!streamId) continue;
      currentStreams[streamId] = (currentStreams[streamId] ?? 0) + 1;
    }

    const nextLive = {
      activeUsers: lastSeenRef.current.size,
      currentStreams,
    };

    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, live: nextLive };
    });
  };

  const fetchData = async (soft = false) => {
    if (soft) setSoftRefreshing(true);
    else setLoading(true);

    setError("");
    try {
      const res = await fetch(`/api/analytics/stats?period=${period}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError((json && (json.error || json.message)) || "Impossible de charger les analytics.");
        return;
      }
      if (json) setData(json);
    } catch {
      setError("Erreur réseau: impossible de charger les analytics.");
    } finally {
      setLoading(false);
      setSoftRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const t = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // realtime subscription
  useEffect(() => {
    let alive = true;
    let channel: any = null;
    let supabase: any = null;
    let purgeTimer: any = null;

    const run = async () => {
      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json());
        if (!me?.ok) return;

        const tenantId: string | null = me.user?.tenant_id ?? null;
        if (!tenantId) return;

        const tokenRes = await fetch("/api/auth/realtime-token", { cache: "no-store" });
        const tokenJson = await tokenRes.json().catch(() => null);
        if (!tokenRes.ok || !tokenJson?.ok) return;

        const accessToken = tokenJson.access_token as string;

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        supabase = createClient(url, anon, {
          realtime: { params: { eventsPerSecond: 30 } },
        });

        supabase.realtime.setAuth(accessToken);

        channel = supabase
          .channel(`analytics:${tenantId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "analytics_events",
              filter: `tenant_id=eq.${tenantId}`,
            },
            (payload: any) => {
              if (!alive) return;
              const row = payload.new as RealtimeEventRow;

              if (row?.event_type === "heartbeat" && row.session_id) {
                lastSeenRef.current.set(row.session_id, Date.now());
                sessionStreamRef.current.set(row.session_id, row.stream_id ?? null);
                recomputeLive();
              }
            }
          )
          .subscribe();

        purgeTimer = setInterval(() => {
          if (!alive) return;
          recomputeLive();
        }, 5_000);
      } catch (e) {
        console.error("Realtime init error", e);
      }
    };

    run();

    return () => {
      alive = false;
      try {
        if (purgeTimer) clearInterval(purgeTimer);
      } catch {}
      try {
        if (channel) channel.unsubscribe();
      } catch {}
      try {
        if (supabase) supabase.removeAllChannels();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpi = data?.kpi;
  const live = data?.live;

  const totalUsers = formatNumber(safeNumber(kpi?.totalUsers, 0));
  const totalEvents = formatNumber(safeNumber(kpi?.totalEvents, 0));
  const watchTime = formatWatchTimeMinutes(safeNumber(kpi?.watchTime, 0));
  const activeUsers = safeNumber(live?.activeUsers, 0);

  const traffic = useMemo(() => (Array.isArray(data?.traffic) ? data!.traffic : []), [data]);

  const topStreams = useMemo(() => {
    const entries = Object.entries(live?.currentStreams ?? {});
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [live?.currentStreams]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -bottom-48 right-[-120px] h-[520px] w-[520px] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Oniix Console
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-700" />
              <span className="text-zinc-300">Analytics</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Dashboard</h1>

              <Pill>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-50"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
                </span>
                <span className="font-semibold">Realtime</span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">{activeUsers} actifs</span>
              </Pill>

              {softRefreshing && (
                <Pill>
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  <span className="text-zinc-400">Mise à jour…</span>
                </Pill>
              )}
            </div>

            <p className="text-sm text-zinc-500 max-w-2xl">
              Live viewers par stream (stream_id envoyé depuis le player) + KPI sur période.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList className="bg-zinc-900/50 border border-white/10">
                <TabsTrigger value="24h">24H</TabsTrigger>
                <TabsTrigger value="7d">7J</TabsTrigger>
                <TabsTrigger value="30d">30J</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              className="border-white/10 bg-zinc-950/40 hover:bg-white/5"
              onClick={() => fetchData(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Rafraîchir
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Live"
            value={formatCompact(activeUsers)}
            sub="Sessions actives (realtime)"
            icon={Radio}
            accent="rose"
            loading={loading && !data}
          />
          <MetricCard
            title="Visiteurs uniques"
            value={totalUsers}
            sub="Période sélectionnée"
            icon={Users}
            accent="indigo"
            loading={loading && !data}
          />
          <MetricCard
            title="Watch time"
            value={watchTime}
            sub="Cumul (minutes)"
            icon={Clock}
            accent="emerald"
            loading={loading && !data}
          />
          <MetricCard
            title="Événements"
            value={totalEvents}
            sub="Logs / hits / heartbeats"
            icon={Activity}
            accent="indigo"
            loading={loading && !data}
          />
        </div>

        <Separator className="bg-white/5" />

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-8 bg-zinc-900/40 border-white/10 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-bold tracking-wide text-white">Audience</CardTitle>
                  <CardDescription className="text-zinc-500">Évolution des viewers sur la période.</CardDescription>
                </div>
                <Pill>
                  <span className="text-zinc-400">Points</span>
                  <span className="text-zinc-200 font-semibold">{traffic.length}</span>
                </Pill>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="h-[340px] w-full">
                {loading && !data ? (
                  <div className="h-full w-full rounded-xl border border-white/10 bg-zinc-950/30 p-6">
                    <div className="space-y-3">
                      <SkeletonLine w="w-56" />
                      <SkeletonLine />
                      <SkeletonLine />
                      <SkeletonLine w="w-4/5" />
                      <div className="mt-6 h-44 w-full animate-pulse rounded bg-white/5" />
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={traffic}>
                      <defs>
                        <linearGradient id="audGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                      <XAxis dataKey="time" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} width={32} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#09090b",
                          border: "1px solid #ffffff12",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "#fff",
                        }}
                        labelStyle={{ color: "#a1a1aa" }}
                      />
                      <Area type="monotone" dataKey="viewers" stroke="#6366f1" strokeWidth={2} fill="url(#audGrad)" dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-4 space-y-4">
            <Card className="bg-zinc-900/40 border-white/10 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-white">Top streams (live)</CardTitle>
                <CardDescription className="text-zinc-500">Calculé en temps réel via heartbeats.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading && !data ? (
                  <>
                    <div className="h-10 rounded-lg bg-white/5 animate-pulse" />
                    <div className="h-10 rounded-lg bg-white/5 animate-pulse" />
                    <div className="h-10 rounded-lg bg-white/5 animate-pulse" />
                  </>
                ) : topStreams.length > 0 ? (
                  topStreams.map(([sid, count]) => (
                    <div
                      key={sid}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950/30 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{sid}</div>
                        <div className="text-[11px] text-zinc-500">Viewers realtime</div>
                      </div>
                      <div className="text-sm font-bold text-indigo-300">{formatNumber(count)}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-white/10 bg-zinc-950/30 px-3 py-4 text-sm text-zinc-500 text-center">
                    Aucun viewer détecté pour le moment.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/40 border-white/10 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-white">Live status</CardTitle>
                <CardDescription className="text-zinc-500">Sessions actives sur fenêtre glissante.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest">Sessions actives</div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                      </span>
                      <span className="text-xs text-zinc-400">Realtime</span>
                    </div>
                  </div>
                  <div className="mt-2 text-3xl font-black tracking-tight text-white">
                    {loading && !data ? "—" : formatNumber(activeUsers)}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">Fenêtre glissante (≈ 45s)</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest">Notes</div>
                  <div className="mt-2 text-sm text-zinc-300">
                    stream_id envoyé depuis le player • tenant isolé via RLS • purge auto.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="pt-2 text-xs text-zinc-600">
          Realtime Supabase: INSERT sur analytics_events. currentStreams = sessions regroupées par stream_id.
        </div>
      </div>
    </div>
  );
}

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
  Sparkles
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { createClient } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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

/* ----------------------------- UI atoms ----------------------------- */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
      {children}
    </div>
  );
}

/**
 * StatCard compact — même gabarit visuel que “Total / Actives / Inactives / Catégories”
 * (p-4, valeur text-2xl, pill en haut à droite, icône réduite).
 */
function StatCard({
  title,
  value,
  tone,
  icon: Icon,
  pillLabel = "Live"
}: {
  title: string;
  value: string;
  tone: "neutral" | "success" | "muted" | "indigo" | "rose";
  icon: any;
  pillLabel?: string;
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-100"
      : tone === "muted"
      ? "bg-white/5 border-white/10 text-zinc-100"
      : tone === "indigo"
      ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-100"
      : tone === "rose"
      ? "bg-rose-500/10 border-rose-500/20 text-rose-100"
      : "bg-white/5 border-white/10 text-zinc-100";

  const iconTone =
    tone === "success"
      ? "text-emerald-300"
      : tone === "indigo"
      ? "text-indigo-300"
      : tone === "rose"
      ? "text-rose-300"
      : "text-zinc-200";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{title}</p>
        <span
          className={`text-xs px-2 py-1 rounded-full border inline-flex items-center gap-2 ${toneClasses}`}
        >
          <Icon className={`h-3.5 w-3.5 ${iconTone}`} />
          {pillLabel}
        </span>
      </div>

      <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>

      <p className="mt-1 text-xs text-zinc-500">Période: {title.includes("(") ? "" : ""}</p>
    </div>
  );
}

function SegTabs({
  value,
  onChange
}: {
  value: "24h" | "7d" | "30d";
  onChange: (v: "24h" | "7d" | "30d") => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as any)}>
      <TabsList className="h-9 bg-zinc-900/50 border border-white/10">
        <TabsTrigger value="24h">24H</TabsTrigger>
        <TabsTrigger value="7d">7J</TabsTrigger>
        <TabsTrigger value="30d">30J</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function SkeletonBlock() {
  return (
    <div className="h-full w-full rounded-xl border border-white/10 bg-zinc-950/30 p-5">
      <div className="space-y-3">
        <div className="h-3 w-48 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-full animate-pulse rounded bg-white/5" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-white/5" />
        <div className="mt-5 h-36 w-full animate-pulse rounded bg-white/5" />
      </div>
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function DashboardPage() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [softRefreshing, setSoftRefreshing] = useState(false);
  const [error, setError] = useState<string>("");

  // realtime caches
  const lastSeenRef = useRef<Map<string, number>>(new Map());
  const sessionStreamRef = useRef<Map<string, string | null>>(new Map());

  const LIVE_WINDOW_MS = 45_000;

  const recomputeLive = () => {
    const now = Date.now();

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

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        live: { activeUsers: lastSeenRef.current.size, currentStreams }
      };
    });
  };

  const fetchData = async (soft = false) => {
    if (soft) setSoftRefreshing(true);
    else setLoading(true);

    setError("");
    try {
      const res = await fetch(`/api/analytics/stats?period=${period}`, {
        cache: "no-store"
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          (json && (json.error || json.message)) ||
            "Impossible de charger les analytics."
        );
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
        const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) =>
          r.json()
        );
        if (!me?.ok) return;

        const tenantId: string | null = me.user?.tenant_id ?? null;
        if (!tenantId) return;

        const tokenRes = await fetch("/api/auth/realtime-token", {
          cache: "no-store"
        });
        const tokenJson = await tokenRes.json().catch(() => null);
        if (!tokenRes.ok || !tokenJson?.ok) return;

        const accessToken = tokenJson.access_token as string;

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        supabase = createClient(url, anon, {
          realtime: { params: { eventsPerSecond: 30 } }
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
              filter: `tenant_id=eq.${tenantId}`
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

  const activeUsers = safeNumber(live?.activeUsers, 0);
  const totalUsers = safeNumber(kpi?.totalUsers, 0);
  const totalEvents = safeNumber(kpi?.totalEvents, 0);
  const watchTime = safeNumber(kpi?.watchTime, 0);

  const traffic = useMemo(
    () => (Array.isArray(data?.traffic) ? data!.traffic : []),
    [data]
  );

  const topStreams = useMemo(() => {
    const entries = Object.entries(live?.currentStreams ?? {});
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [live?.currentStreams]);

  const periodLabel = period === "24h" ? "24H" : period === "7d" ? "7J" : "30J";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Premium background (same visual language as Channels) */}
      <div className="fixed inset-0 -z-10 bg-zinc-950" />
      <div className="fixed inset-0 -z-10 opacity-70 [background:radial-gradient(900px_circle_at_15%_0%,rgba(99,102,241,0.14),transparent_55%),radial-gradient(900px_circle_at_85%_25%,rgba(16,185,129,0.08),transparent_55%)]" />
      <div className="fixed inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-black/35 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Topbar (compact + sticky) */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-zinc-950/70 backdrop-blur-xl border-b border-white/5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-2 text-zinc-300">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  Console
                </span>
                <ChevronRight className="h-4 w-4 text-zinc-700" />
                <span className="text-white">Analytics</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white">
                  Dashboard
                </h1>

                <Pill>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                  </span>
                  <span className="font-semibold">Realtime</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-400">
                    {formatNumber(activeUsers)} actifs
                  </span>
                </Pill>

                {softRefreshing && (
                  <Pill>
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                    <span className="text-zinc-400">Mise à jour…</span>
                  </Pill>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SegTabs value={period} onChange={setPeriod} />

              <Button
                variant="outline"
                className="h-9 border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
                onClick={() => fetchData(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Rafraîchir
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* KPI cards — compact like Channels stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={`Live (${periodLabel})`}
            value={formatCompact(activeUsers)}
            tone="rose"
            icon={Radio}
          />
          <StatCard
            title={`Visiteurs (${periodLabel})`}
            value={formatCompact(totalUsers)}
            tone="indigo"
            icon={Users}
          />
          <StatCard
            title={`Watch time (${periodLabel})`}
            value={formatWatchTimeMinutes(watchTime)}
            tone="success"
            icon={Clock}
          />
          <StatCard
            title={`Événements (${periodLabel})`}
            value={formatCompact(totalEvents)}
            tone="muted"
            icon={Activity}
          />
        </div>

        <Separator className="bg-white/5" />

        {/* Main layout — resized cards */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Audience (compact header + reduced height) */}
          <Card className="lg:col-span-8 bg-white/5 border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
            <CardHeader className="px-4 sm:px-5 pt-4 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold text-white">
                    Audience
                  </CardTitle>
                  <CardDescription className="text-zinc-500">
                    Viewers sur la période sélectionnée.
                  </CardDescription>
                </div>

                <Badge className="bg-white/5 border border-white/10 text-zinc-200">
                  {formatNumber(traffic.length)} points
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-5 py-4">
              <div className="h-[240px] sm:h-[270px] w-full">
                {loading && !data ? (
                  <SkeletonBlock />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={traffic}>
                      <defs>
                        <linearGradient id="audGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#ffffff08"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="time"
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={34}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#09090b",
                          border: "1px solid #ffffff12",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "#fff"
                        }}
                        labelStyle={{ color: "#a1a1aa" }}
                      />

                      <Area
                        type="monotone"
                        dataKey="viewers"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#audGrad)"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right column (compact, same density) */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
              <CardHeader className="px-4 sm:px-5 pt-4 pb-3 border-b border-white/10">
                <CardTitle className="text-sm font-semibold text-white">
                  Top streams (live)
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Classement en temps réel.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-4 sm:px-5 py-4 space-y-2">
                {loading && !data ? (
                  <>
                    <div className="h-10 rounded-lg bg-white/5 animate-pulse border border-white/10" />
                    <div className="h-10 rounded-lg bg-white/5 animate-pulse border border-white/10" />
                    <div className="h-10 rounded-lg bg-white/5 animate-pulse border border-white/10" />
                  </>
                ) : topStreams.length > 0 ? (
                  topStreams.map(([sid, count]) => (
                    <div
                      key={sid}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950/30 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{sid}</div>
                        <div className="text-[11px] text-zinc-500">Viewers</div>
                      </div>
                      <div className="text-sm font-semibold text-indigo-300">
                        {formatNumber(count)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-white/10 bg-zinc-950/30 px-3 py-4 text-sm text-zinc-500 text-center">
                    Aucun viewer détecté.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
              <CardHeader className="px-4 sm:px-5 pt-4 pb-3 border-b border-white/10">
                <CardTitle className="text-sm font-semibold text-white">
                  Sessions actives
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Fenêtre glissante (~45s).
                </CardDescription>
              </CardHeader>

              <CardContent className="px-4 sm:px-5 py-4 space-y-3">
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest">
                      Realtime
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      <span className="text-xs text-zinc-400">Actif</span>
                    </div>
                  </div>

                  <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
                    {loading && !data ? "—" : formatNumber(activeUsers)}
                  </div>

                  <div className="mt-1 text-xs text-zinc-500">
                    Période: {periodLabel}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

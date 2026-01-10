"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Clock, Loader2, Users, Radio } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

type DashboardData = {
  live: { activeUsers: number; currentStreams: Record<string, number> };
  traffic: { time: string; viewers: number }[];
  devices: { name: string; value: number; color?: string }[];
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

function getOrCreateSessionId() {
  const key = "oniix_session_id";
  let v = "";
  try {
    v = localStorage.getItem(key) || "";
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(key, v);
    }
  } catch {
    // fallback
    v = `sess_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
  return v;
}

function deviceHint() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/mobile/i.test(ua)) return "mobile";
  if (/tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("24h");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // LIVE cache (session_id -> lastSeen)
  const lastSeenRef = useRef<Map<string, number>>(new Map());
  const streamCountRef = useRef<Map<string, number>>(new Map());

  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const HEARTBEAT_SEC = 15;
  const LIVE_WINDOW_MS = 45_000; // un peu > 2 heartbeats

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/analytics/stats?period=${period}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json) setData(json);
    } catch (err) {
      console.error("Load error", err);
    } finally {
      setLoading(false);
    }
  };

  // Heartbeat sender
  const sendHeartbeat = async () => {
    try {
      await fetch("/api/analytics/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          stream_id: null, // si tu veux associer un stream en cours -> mets l'id ici
          device: deviceHint(),
        }),
      });
    } catch {
      // ignore
    }
  };

  // Recompute live from caches
  const recomputeLive = () => {
    const now = Date.now();

    // purge old sessions
    for (const [sid, ts] of lastSeenRef.current.entries()) {
      if (now - ts > LIVE_WINDOW_MS) lastSeenRef.current.delete(sid);
    }

    // recompute stream counts
    const currentStreams: Record<string, number> = {};
    streamCountRef.current.clear();

    // NOTE: on ne garde pas la correspondance stream par session ici,
    // donc on fait simple pour l’instant: si stream_id null => pas compté.
    // (Quand tu voudras, on ajoute "stream_id" au heartbeat pour le vrai détail)
    // => on peut laisser currentStreams vide pour l’instant.
    // currentStreams["global"] = lastSeenRef.current.size;

    const nextLive = {
      activeUsers: lastSeenRef.current.size,
      currentStreams,
    };

    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, live: nextLive };
    });
  };

  // Initial fetch + polling fallback
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000); // KPI/traffic refresh
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Heartbeat loop
  useEffect(() => {
    sendHeartbeat();
    const t = setInterval(sendHeartbeat, HEARTBEAT_SEC * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Realtime subscription
  useEffect(() => {
    let alive = true;
    let channel: any = null;

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
        const supabase = createClient(url, anon, {
          realtime: { params: { eventsPerSecond: 20 } },
        });

        // Auth pour RLS realtime
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
                recomputeLive();
              }
            }
          )
          .subscribe((status: string) => {
            // console.log("Realtime status:", status);
          });

        // local ticker pour purge
        const purge = setInterval(() => {
          if (!alive) return;
          recomputeLive();
        }, 5_000);

        return () => clearInterval(purge);
      } catch (e) {
        console.error("Realtime init error", e);
      }
    };

    const cleanupPromise = run();

    return () => {
      alive = false;
      try {
        if (channel) channel.unsubscribe();
      } catch {}
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      cleanupPromise;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-xs tracking-widest">
        <Loader2 className="h-4 w-4 animate-spin mr-3 text-indigo-500" />
        SYNCING_REALTIME_DATA...
      </div>
    );
  }

  const totalUsers = (data?.kpi?.totalUsers ?? 0).toLocaleString();
  const totalEvents = (data?.kpi?.totalEvents ?? 0).toLocaleString();
  const watchTimeMin = data?.kpi?.watchTime ?? 0;
  const watchTimeLabel =
    watchTimeMin > 0 ? `${Math.floor(watchTimeMin / 60)}h ${Math.round(watchTimeMin % 60)}m` : "0m";

  return (
    <div className="min-h-screen space-y-8 p-6 bg-zinc-950 text-zinc-100">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tighter text-white">ONIIX_ANALYTICS</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-rose-500/10 border border-rose-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Live</span>
            </div>
          </div>
        </div>

        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="bg-zinc-900 border border-white/5">
            <TabsTrigger value="24h">24H</TabsTrigger>
            <TabsTrigger value="7d">7J</TabsTrigger>
            <TabsTrigger value="30d">30J</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          title="Spectateurs Live"
          value={data?.live?.activeUsers ?? 0}
          icon={Radio}
          trend="TEMPS RÉEL"
          trendUp={true}
          desc="Sessions actives"
          highlight={true}
        />
        <KpiCard
          title="Visiteurs Uniques"
          value={totalUsers}
          icon={Users}
          trend="+"
          trendUp={true}
          desc="Période"
        />
        <KpiCard
          title="Watch Time"
          value={watchTimeLabel}
          icon={Clock}
          trend="OK"
          trendUp={true}
          desc="Minutes"
        />
        <KpiCard
          title="Logs API"
          value={totalEvents}
          icon={Activity}
          trend="OK"
          trendUp={true}
          desc="Événements"
        />
      </div>

      {/* CHART */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-5 bg-zinc-900/40 border-white/5 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white text-sm uppercase tracking-widest font-bold">
              Flux d'audience
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.traffic ?? []}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
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
                  <Area type="monotone" dataKey="viewers" stroke="#6366f1" strokeWidth={2} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-4">
          <Card className="bg-zinc-900/40 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase text-zinc-500">
                Contenus les plus vus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data && Object.entries(data.live?.currentStreams ?? {}).length > 0 ? (
                Object.entries(data.live.currentStreams)
                  .sort((a, b) => b[1] - a[1])
                  .map(([sid, count]) => (
                    <div key={sid} className="flex justify-between items-center p-2 rounded bg-white/5">
                      <span className="text-[10px] font-mono text-zinc-400 truncate w-32">{sid}</span>
                      <span className="text-xs font-bold text-indigo-400">{count} 🔥</span>
                    </div>
                  ))
              ) : (
                <p className="text-[10px] text-zinc-600 text-center py-4">Zéro activité live.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, trend, trendUp, desc, highlight }: any) {
  return (
    <Card className={`bg-zinc-900/40 border-white/5 ${highlight ? "border-indigo-500/30 ring-1 ring-indigo-500/10" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">{title}</CardTitle>
        <Icon className={`h-3 w-3 ${highlight ? "text-indigo-500" : "text-zinc-600"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-white tracking-tighter">{value}</div>
        <div className="flex items-center text-[10px] mt-1 uppercase font-bold">
          <span className={trendUp ? "text-emerald-500" : "text-rose-500"}>{trend}</span>
          <span className="text-zinc-700 ml-2">{desc}</span>
        </div>
      </CardContent>
    </Card>
  );
}

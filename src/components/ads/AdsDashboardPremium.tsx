"use client";

import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, MousePointerClick, TrendingUp, Radio, Tv2, RefreshCw } from "lucide-react";
import { useAdsRealtime } from "@/lib/ads/useAdsRealtime";
import { usePresenceCount } from "@/lib/realtime/usePresenceCount";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SummaryResponse =
  | {
      ok: true;
      window_hours: number;
      bucket: "hour" | "minute";
      since: string;
      filter?: { channelId?: string | null; streamId?: string | null };
      kpi: { impressions: number; clicks: number; ctr: number };
      timeseries: { time: string; impressions: number; clicks: number }[];
      topCampaigns: {
        campaign_id: string;
        name: string;
        type: string;
        priority: number;
        impressions: number;
        clicks: number;
        ctr: number;
      }[];
    }
  | { ok: false; error: string };

type ChannelRow = { id: string; name: string; logo?: string | null };
type StreamRow = { id: string; title: string; channelId?: string | null; channel_id?: string | null };

function fmt(n: number) {
  return (n ?? 0).toLocaleString();
}

function timeLabel(t: string) {
  const parts = t.split(" ");
  if (parts.length === 2) return parts[1];
  return t;
}

function eventLabel(event: string) {
  const key = (event || "").toUpperCase();
  if (key === "IMPRESSION") return "Impression";
  if (key === "CLICK") return "Clic";
  if (key === "START") return "Debut";
  if (key === "COMPLETE") return "Fin";
  if (key === "SKIP") return "Ignore";
  return "Activite";
}

export default function AdsDashboardPremium(props: { accessToken: string | null; tenantId: string | null }) {
  const { accessToken, tenantId } = props;

  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const hours = period === "24h" ? 24 : period === "7d" ? 168 : 720;

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [selectedChannelId, setSelectedChannelId] = useState<string>(""); // "" => all tenant
  const [selectedStreamId, setSelectedStreamId] = useState<string>(""); // "" => all streams

  // ✅ realtime counters + feed
  const { counters, events } = useAdsRealtime({
    accessToken,
    tenantId,
    channelId: selectedChannelId || null,
    streamId: selectedStreamId || null,
    enabled: !!accessToken && !!tenantId,
  });

  // ✅ Presence monitor (only if stream selected)
  const { count: liveViewers, status: liveStatus } = usePresenceCount({
    accessToken,
    channelName: selectedStreamId ? `live_views_${selectedStreamId}` : null,
    enabled: !!accessToken && !!tenantId && !!selectedStreamId,
  });

  const refreshSummary = async () => {
    if (!accessToken || !tenantId) return;
    setLoading(true);

    try {
      const qs = new URLSearchParams();
      qs.set("hours", String(hours));
      qs.set("bucket", "hour");

      if (selectedStreamId) qs.set("streamId", selectedStreamId);
      else if (selectedChannelId) qs.set("channelId", selectedChannelId);

      const res = await fetch(`/api/ads/summary?${qs.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as SummaryResponse | null;
      if (json) setSummary(json);
    } finally {
      setLoading(false);
    }
  };

  // Load channels + streams (tenant scope)
  useEffect(() => {
    if (!accessToken || !tenantId) return;

    let mounted = true;
    (async () => {
      setLoadingFilters(true);
      try {
        const [cRes, sRes] = await Promise.all([
          fetch("/api/channels", { cache: "no-store" }).catch(() => null),
          fetch("/api/streams", { cache: "no-store" }).catch(() => null),
        ]);

        const cJson = cRes ? await cRes.json().catch(() => []) : [];
        const sJson = sRes ? await sRes.json().catch(() => []) : [];

        if (!mounted) return;

        const cList: ChannelRow[] = Array.isArray(cJson) ? cJson : [];
        const sList: StreamRow[] = Array.isArray(sJson) ? sJson : [];

        setChannels(cList.map((c) => ({ id: String(c.id), name: String(c.name ?? "Channel"), logo: (c as any).logo ?? null })));
        setStreams(
          sList.map((s) => ({
            id: String((s as any).id),
            title: String((s as any).title ?? "Stream"),
            channelId: String((s as any).channelId ?? (s as any).channel_id ?? ""),
            channel_id: String((s as any).channel_id ?? (s as any).channelId ?? ""),
          }))
        );
      } finally {
        if (mounted) setLoadingFilters(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [accessToken, tenantId]);

  // When channel changes -> reset stream selection
  useEffect(() => {
    setSelectedStreamId("");
  }, [selectedChannelId]);

  // Refresh summary when filters or period change
  useEffect(() => {
    refreshSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, tenantId, hours, selectedChannelId, selectedStreamId]);

  const visibleStreams = useMemo(() => {
    if (!selectedChannelId) return streams;
    return streams.filter((s) => (s.channelId || s.channel_id || "") === selectedChannelId);
  }, [streams, selectedChannelId]);

  const baseImp = summary && "ok" in summary && summary.ok ? summary.kpi.impressions : 0;
  const baseClk = summary && "ok" in summary && summary.ok ? summary.kpi.clicks : 0;

  const liveImp = counters.impressions;
  const liveClk = counters.clicks;

  const totalImp = baseImp + liveImp;
  const totalClk = baseClk + liveClk;
  const ctr = totalImp > 0 ? (totalClk / totalImp) * 100 : 0;

  const chartData = useMemo(() => {
    if (!summary || !("ok" in summary) || !summary.ok) return [];
    return summary.timeseries.map((x) => ({ ...x, timeLabel: timeLabel(x.time) }));
  }, [summary]);

  const scopeLabel = useMemo(() => {
    if (selectedStreamId) {
      const s = streams.find((x) => x.id === selectedStreamId);
      return s?.title ? `Diffusion - ${s.title}` : "Diffusion selectionnee";
    }
    if (selectedChannelId) {
      const c = channels.find((x) => x.id === selectedChannelId);
      return c ? `Chaine - ${c.name}` : "Chaine selectionnee";
    }
    return "Organisation - toutes les chaines";
  }, [selectedChannelId, selectedStreamId, channels, streams]);

  if (!accessToken || !tenantId) {
    return (
      <div className="p-6 text-zinc-500 text-sm">
        Session expiree. Veuillez vous reconnecter pour acceder au tableau de bord.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-zinc-950 text-zinc-100 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Publicités</h1>

            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute h-full w-full rounded-full bg-rose-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">En direct</span>
              <span className="text-[10px] text-zinc-400">
                +{fmt(liveImp)} impressions - +{fmt(liveClk)} clics
              </span>
            </div>

            <div className="text-[10px] px-2 py-1 rounded-md border border-white/10 bg-white/5 text-zinc-300 uppercase tracking-widest">
              {scopeLabel}
            </div>
          </div>

          <p className="text-sm text-zinc-500">
            Suivez la performance publicitaire en temps reel, avec filtres par chaine et diffusion.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList className="bg-zinc-900 border border-white/5">
              <TabsTrigger value="24h">24H</TabsTrigger>
              <TabsTrigger value="7d">7J</TabsTrigger>
              <TabsTrigger value="30d">30J</TabsTrigger>
            </TabsList>
          </Tabs>

          <button
            type="button"
            onClick={refreshSummary}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-200 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <Card className="bg-zinc-900/30 border-white/5">
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Tv2 className="h-4 w-4 text-zinc-500" />
              <span className="uppercase tracking-widest">Filtre</span>
              <span className="text-zinc-600">—</span>
              <span className="text-zinc-300">{scopeLabel}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full lg:w-[560px]">
              {/* Channel select */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Chaine</div>
                <select
                  value={selectedChannelId}
                  onChange={(e) => setSelectedChannelId(e.target.value)}
                  disabled={loadingFilters}
                  className="h-10 w-full rounded-md bg-zinc-950/60 border border-white/10 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60"
                >
                  <option value="">Toutes les chaines</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stream select */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Diffusion</div>
                <select
                  value={selectedStreamId}
                  onChange={(e) => setSelectedStreamId(e.target.value)}
                  disabled={loadingFilters || visibleStreams.length === 0}
                  className="h-10 w-full rounded-md bg-zinc-950/60 border border-white/10 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60"
                >
                  <option value="">Toutes les diffusions</option>
                  {visibleStreams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || "Diffusion"}
                    </option>
                  ))}
                </select>

                <div className="text-[10px] text-zinc-600">
                  {selectedStreamId ? (
                    <span>
                      Audience :{" "}
                      <span className="text-zinc-300">
                        {liveStatus === "live" ? `${fmt(liveViewers)} spectateurs` : "connexion..."}
                      </span>
                    </span>
                  ) : (
                    <span>Choisissez une diffusion pour activer le compteur d'audience.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI ROW */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Impressions" value={fmt(totalImp)} sub={`En direct +${fmt(liveImp)}`} icon={Eye} />
        <KpiCard title="Clics" value={fmt(totalClk)} sub={`En direct +${fmt(liveClk)}`} icon={MousePointerClick} />
        <KpiCard title="Taux de clic" value={`${ctr.toFixed(2)}%`} sub="Clics / Impressions" icon={TrendingUp} />
        <KpiCard
          title="Audience en direct"
          value={selectedStreamId ? fmt(liveViewers) : "-"}
          sub={selectedStreamId ? (liveStatus === "live" ? "audience en direct" : "connexion...") : "selectionnez une diffusion"}
          icon={Radio}
          highlight
        />
      </div>

      {/* Chart + Top */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-5 bg-zinc-900/40 border-white/5 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-sm uppercase tracking-widest text-white">Performance</CardTitle>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
              {summary && "ok" in summary && summary.ok ? `Depuis ${new Date(summary.since).toLocaleString()}` : "—"}
            </div>
          </CardHeader>

          <CardContent className="pl-0">
            {loading ? (
              <div className="h-[320px] flex items-center justify-center text-zinc-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement…
              </div>
            ) : summary && "ok" in summary && summary.ok ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="10%" stopOpacity={0.25} />
                        <stop offset="95%" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="clkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="10%" stopOpacity={0.15} />
                        <stop offset="95%" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                    <XAxis dataKey="timeLabel" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#09090b",
                        border: "1px solid #ffffff15",
                        fontSize: "12px",
                      }}
                    />

                    <Area type="monotone" dataKey="impressions" strokeWidth={2} fill="url(#impGrad)" />
                    <Area type="monotone" dataKey="clicks" strokeWidth={2} fill="url(#clkGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-zinc-500 text-sm">
                Données indisponibles.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-zinc-900/40 border-white/5">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-white">Top campagnes</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex items-center text-zinc-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Sync…
              </div>
            ) : summary && "ok" in summary && summary.ok ? (
              summary.topCampaigns.length === 0 ? (
                <div className="text-zinc-600 text-sm py-6 text-center">Aucune campagne.</div>
              ) : (
                summary.topCampaigns.map((c) => (
                  <div key={c.campaign_id} className="rounded-lg border border-white/10 bg-zinc-950/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{c.name}</div>
                        <div className="text-[10px] text-zinc-500 truncate">Type : {c.type} - Priorite : {c.priority}</div>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">{c.ctr.toFixed(2)}%</div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                      <div className="rounded-md bg-white/5 border border-white/10 px-2 py-1">
                        Impressions <span className="text-white font-semibold">{fmt(c.impressions)}</span>
                      </div>
                      <div className="rounded-md bg-white/5 border border-white/10 px-2 py-1">
                        Clics <span className="text-white font-semibold">{fmt(c.clicks)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              <div className="text-zinc-600 text-sm py-6 text-center">Erreur.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live events feed */}
      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-widest text-white">Activite en direct</CardTitle>
          <div className="text-[10px] text-zinc-500">
            {events.length > 0 ? `Derniere activite : ${new Date(events[0].created_at).toLocaleTimeString()}` : "—"}
          </div>
        </CardHeader>

        <CardContent>
          {events.length === 0 ? (
            <div className="text-zinc-600 text-sm py-6 text-center">Aucune activite recente pour le moment.</div>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 25).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                >
                  <div className="text-xs text-zinc-200">
                    <span className="font-bold text-white">{eventLabel(e.event)}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">{new Date(e.created_at).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  highlight,
}: {
  title: string;
  value: string;
  sub: string;
  icon: any;
  highlight?: boolean;
}) {
  return (
    <Card className={cn("bg-zinc-900/40 border-white/5", highlight ? "border-indigo-500/25 ring-1 ring-indigo-500/10" : "")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", highlight ? "text-indigo-400" : "text-zinc-600")} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tracking-tight text-white">{value}</div>
        <div className="mt-1 text-[11px] text-zinc-500">{sub}</div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Eye,
  Loader2,
  MousePointerClick,
  Radio,
  RefreshCw,
  TrendingUp,
  Tv2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAdsRealtime } from "@/lib/ads/useAdsRealtime";
import { usePresenceCount } from "@/lib/realtime/usePresenceCount";

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
type StreamRow = { id: string; title: string; channelId: string | null };

type IconComponent = React.ComponentType<{ className?: string }>;

function fmt(value: number) {
  return (value ?? 0).toLocaleString("fr-FR");
}

function timeLabel(value: string) {
  const parts = value.split(" ");
  return parts.length === 2 ? parts[1] : value;
}

function eventLabel(event: string) {
  const key = event.toUpperCase();
  if (key === "IMPRESSION") return "Impression";
  if (key === "CLICK") return "Clic";
  if (key === "START") return "Début";
  if (key === "COMPLETE") return "Fin";
  if (key === "SKIP") return "Ignoré";
  return "Activité";
}

function mapChannelRow(row: unknown): ChannelRow | null {
  const value = row as Record<string, unknown>;
  const id = String(value.id ?? "").trim();
  const name = String(value.name ?? "").trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    logo: typeof value.logo === "string" ? value.logo : null,
  };
}

function mapStreamRow(row: unknown): StreamRow | null {
  const value = row as Record<string, unknown>;
  const id = String(value.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    title: String(value.title ?? "Diffusion"),
    channelId:
      typeof value.channel_id === "string"
        ? value.channel_id
        : typeof value.channelId === "string"
          ? value.channelId
          : null,
  };
}

export default function AdsDashboardPremium() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState("");

  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [selectedStreamId, setSelectedStreamId] = useState("");

  const hours = period === "24h" ? 24 : period === "7d" ? 168 : 720;

  const { counters, events } = useAdsRealtime({
    channelId: selectedChannelId || null,
    streamId: selectedStreamId || null,
    enabled: true,
    windowSec: 300,
  });

  const { count: liveViewers, status: liveStatus } = usePresenceCount({
    streamId: selectedStreamId || null,
    enabled: Boolean(selectedStreamId),
    windowSec: 35,
  });

  const refreshSummary = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        hours: String(hours),
        bucket: "hour",
      });

      if (selectedStreamId) params.set("streamId", selectedStreamId);
      else if (selectedChannelId) params.set("channelId", selectedChannelId);

      const res = await fetch(`/api/ads/summary?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as SummaryResponse | null;

      if (!res.ok || !json) {
        setError("Impossible de charger le tableau de bord publicitaire.");
        return;
      }

      setSummary(json);
      if (!("ok" in json) || !json.ok) {
        setError(json.error || "Impossible de charger le tableau de bord publicitaire.");
      }
    } catch {
      setError("Impossible de charger le tableau de bord publicitaire.");
    } finally {
      setLoading(false);
    }
  }, [hours, selectedChannelId, selectedStreamId]);

  useEffect(() => {
    let cancelled = false;

    const loadFilters = async () => {
      setLoadingFilters(true);
      try {
        const [channelsRes, streamsRes] = await Promise.all([
          fetch("/api/channels", { cache: "no-store" }).catch(() => null),
          fetch("/api/streams", { cache: "no-store" }).catch(() => null),
        ]);

        const channelsJson = channelsRes ? await channelsRes.json().catch(() => []) : [];
        const streamsJson = streamsRes ? await streamsRes.json().catch(() => []) : [];

        if (cancelled) return;

        const nextChannels = Array.isArray(channelsJson)
          ? channelsJson.map(mapChannelRow).filter((row): row is ChannelRow => row !== null)
          : [];

        const nextStreams = Array.isArray(streamsJson)
          ? streamsJson.map(mapStreamRow).filter((row): row is StreamRow => row !== null)
          : [];

        setChannels(nextChannels);
        setStreams(nextStreams);
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    };

    void loadFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelectedStreamId("");
  }, [selectedChannelId]);

  useEffect(() => {
    void refreshSummary();
    const timer = window.setInterval(() => {
      void refreshSummary();
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [refreshSummary]);

  const visibleStreams = useMemo(() => {
    if (!selectedChannelId) return streams;
    return streams.filter((stream) => (stream.channelId ?? "") === selectedChannelId);
  }, [selectedChannelId, streams]);

  const chartData = useMemo(() => {
    if (!summary || !("ok" in summary) || !summary.ok) return [];
    return summary.timeseries.map((item) => ({
      ...item,
      timeLabel: timeLabel(item.time),
    }));
  }, [summary]);

  const scopeLabel = useMemo(() => {
    if (selectedStreamId) {
      const stream = streams.find((item) => item.id === selectedStreamId);
      return stream?.title ? `Diffusion · ${stream.title}` : "Diffusion sélectionnée";
    }

    if (selectedChannelId) {
      const channel = channels.find((item) => item.id === selectedChannelId);
      return channel?.name ? `Chaîne · ${channel.name}` : "Chaîne sélectionnée";
    }

    return "Organisation · toutes les chaînes";
  }, [channels, selectedChannelId, selectedStreamId, streams]);

  const baseImpressions = summary && "ok" in summary && summary.ok ? summary.kpi.impressions : 0;
  const baseClicks = summary && "ok" in summary && summary.ok ? summary.kpi.clicks : 0;
  const totalImpressions = baseImpressions + counters.impressions;
  const totalClicks = baseClicks + counters.clicks;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div className="console-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Publicité</h1>

            <div className="flex items-center gap-2 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Fenêtre live</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {fmt(counters.impressions)} impressions · {fmt(counters.clicks)} clics
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white/80 px-2.5 py-1 text-[10px] uppercase tracking-widest text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              {scopeLabel}
            </div>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Suivez la performance publicitaire avec des données serveur actualisées en continu.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
            <TabsList className="border border-slate-200 bg-slate-100/90 dark:border-white/10 dark:bg-white/[0.04]">
              <TabsTrigger value="24h">24H</TabsTrigger>
              <TabsTrigger value="7d">7J</TabsTrigger>
              <TabsTrigger value="30d">30J</TabsTrigger>
            </TabsList>
          </Tabs>

          <button
            type="button"
            onClick={() => void refreshSummary()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Tv2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span className="uppercase tracking-widest">Filtre</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-slate-700 dark:text-slate-200">{scopeLabel}</span>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:w-[560px]">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Chaîne</div>
                <select
                  value={selectedChannelId}
                  onChange={(event) => setSelectedChannelId(event.target.value)}
                  disabled={loadingFilters}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                >
                  <option value="">Toutes les chaînes</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Diffusion</div>
                <select
                  value={selectedStreamId}
                  onChange={(event) => setSelectedStreamId(event.target.value)}
                  disabled={loadingFilters || visibleStreams.length === 0}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                >
                  <option value="">Toutes les diffusions</option>
                  {visibleStreams.map((stream) => (
                    <option key={stream.id} value={stream.id}>
                      {stream.title || "Diffusion"}
                    </option>
                  ))}
                </select>

                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {selectedStreamId ? (
                    <span>
                      Audience :{" "}
                      <span className="text-slate-700 dark:text-slate-200">
                        {liveStatus === "live" ? `${fmt(liveViewers)} spectateurs` : "Synchronisation..."}
                      </span>
                    </span>
                  ) : (
                    <span>Choisissez une diffusion pour afficher l&apos;audience live.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Impressions" value={fmt(totalImpressions)} sub={`Fenetre live ${fmt(counters.impressions)}`} icon={Eye} />
        <KpiCard title="Clics" value={fmt(totalClicks)} sub={`Fenetre live ${fmt(counters.clicks)}`} icon={MousePointerClick} />
        <KpiCard title="CTR" value={`${ctr.toFixed(2)}%`} sub="Clics / Impressions" icon={TrendingUp} />
        <KpiCard
          title="Audience live"
          value={selectedStreamId ? fmt(liveViewers) : "-"}
          sub={
            selectedStreamId
              ? liveStatus === "live"
                ? "Audience sur 35 secondes"
                : "Synchronisation..."
              : "Sélectionnez une diffusion"
          }
          icon={Radio}
          highlight
        />
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-sm uppercase tracking-widest text-slate-950 dark:text-white">Performance</CardTitle>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {summary && "ok" in summary && summary.ok ? `Depuis ${new Date(summary.since).toLocaleString("fr-FR")}` : "-"}
            </div>
          </CardHeader>

          <CardContent className="pl-0">
            {loading ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement...
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

                    <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="timeLabel" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontSize: "12px",
                    }}
                  />

                    <Area type="monotone" dataKey="impressions" strokeWidth={2} fill="url(#impGrad)" />
                    <Area type="monotone" dataKey="clicks" strokeWidth={2} fill="url(#clkGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Données indisponibles.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-slate-950 dark:text-white">Top campagnes</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Synchronisation...
              </div>
            ) : summary && "ok" in summary && summary.ok ? (
              summary.topCampaigns.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Aucune campagne.</div>
              ) : (
                summary.topCampaigns.map((campaign) => (
                  <div key={campaign.campaign_id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-950 dark:text-white">{campaign.name}</div>
                        <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                          Type : {campaign.type} · Priorité : {campaign.priority}
                        </div>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{campaign.ctr.toFixed(2)}%</div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                      <div className="rounded-xl border border-slate-200/80 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/[0.05]">
                        Impressions <span className="font-semibold text-slate-950 dark:text-white">{fmt(campaign.impressions)}</span>
                      </div>
                      <div className="rounded-xl border border-slate-200/80 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/[0.05]">
                        Clics <span className="font-semibold text-slate-950 dark:text-white">{fmt(campaign.clicks)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Erreur.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-widest text-slate-950 dark:text-white">Activité récente</CardTitle>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {counters.lastEventAt ? `Dernier événement : ${new Date(counters.lastEventAt).toLocaleTimeString("fr-FR")}` : "-"}
          </div>
        </CardHeader>

        <CardContent>
          {events.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Aucune activité récente.</div>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 25).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-slate-950 dark:text-white">{eventLabel(event.event)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {new Date(event.created_at).toLocaleTimeString("fr-FR")}
                  </div>
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
  icon: IconComponent;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        "",
        highlight ? "border-indigo-500/25 ring-1 ring-indigo-500/10" : ""
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", highlight ? "text-indigo-500" : "text-slate-400 dark:text-slate-500")} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{sub}</div>
      </CardContent>
    </Card>
  );
}

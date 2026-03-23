"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Eye,
  Loader2,
  Megaphone,
  MousePointerClick,
  Radio,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { FilterBar } from "@/components/console/filter-bar";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

      const response = await fetch(`/api/ads/summary?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await response.json().catch(() => null)) as SummaryResponse | null;

      if (!response.ok || !json) {
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

  const displayScopeLabel = useMemo(() => {
    if (selectedStreamId) {
      const stream = streams.find((item) => item.id === selectedStreamId);
      return stream?.title ? `Diffusion / ${stream.title}` : "Diffusion sélectionnée";
    }

    if (selectedChannelId) {
      const channel = channels.find((item) => item.id === selectedChannelId);
      return channel?.name ? `Chaîne / ${channel.name}` : "Chaîne sélectionnée";
    }

    return "Organisation / toutes les chaînes";
  }, [channels, selectedChannelId, selectedStreamId, streams]);

  const baseImpressions = summary && "ok" in summary && summary.ok ? summary.kpi.impressions : 0;
  const baseClicks = summary && "ok" in summary && summary.ok ? summary.kpi.clicks : 0;
  const totalImpressions = baseImpressions + counters.impressions;
  const totalClicks = baseClicks + counters.clicks;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const topCampaigns = summary && "ok" in summary && summary.ok ? summary.topCampaigns : [];
  const channelSelectValue = selectedChannelId || "__all__";
  const streamSelectValue = selectedStreamId || "__all__";

  return (
    <PageShell>
      <PageHeader
        title="Publicite"
        subtitle="Suivez la traction publicitaire avec une lecture unifiee des impressions, clics et signaux live."
        breadcrumbs={[{ label: "Oniix Console", href: "/dashboard" }, { label: "Publicite" }]}
        icon={<Megaphone className="size-5" />}
        actions={
          <>
            <Tabs value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
              <TabsList>
                <TabsTrigger value="24h">24H</TabsTrigger>
                <TabsTrigger value="7d">7J</TabsTrigger>
                <TabsTrigger value="30d">30J</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={() => void refreshSummary()}>
              <RefreshCw className="size-4" />
              Actualiser
            </Button>
          </>
        }
      />

      <section className="console-panel flex flex-wrap items-center gap-3 px-5 py-4">
        <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
          Fenêtre live {fmt(counters.impressions)} impressions / {fmt(counters.clicks)} clics
        </Badge>
        <Badge variant="secondary">{displayScopeLabel}</Badge>
        <Badge variant="outline">{loadingFilters ? "Chargement des filtres" : "Filtres synchronisés"}</Badge>
      </section>

      <FilterBar>
        <div className="min-w-[220px]">
          <Select value={channelSelectValue} onValueChange={(value) => setSelectedChannelId(value === "__all__" ? "" : value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Toutes les chaînes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les chaînes</SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[220px]">
          <Select value={streamSelectValue} onValueChange={(value) => setSelectedStreamId(value === "__all__" ? "" : value)}>
            <SelectTrigger className="w-full" disabled={loadingFilters || visibleStreams.length === 0}>
              <SelectValue placeholder="Toutes les diffusions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les diffusions</SelectItem>
              {visibleStreams.map((stream) => (
                <SelectItem key={stream.id} value={stream.id}>
                  {stream.title || "Diffusion"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
          Audience live:{" "}
          <span className="text-white">
            {selectedStreamId ? (liveStatus === "live" ? `${fmt(liveViewers)} spectateurs` : "Synchronisation...") : "Choisissez une diffusion"}
          </span>
        </div>
      </FilterBar>

      {error ? (
        <section className="console-panel border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
        </section>
      ) : null}

      <KpiRow>
        <KpiCard
          label="Impressions"
          value={fmt(totalImpressions)}
          hint={`Fenêtre live ${fmt(counters.impressions)}`}
          icon={<Eye className="size-4" />}
          loading={loading}
        />
        <KpiCard
          label="Clics"
          value={fmt(totalClicks)}
          hint={`Fenêtre live ${fmt(counters.clicks)}`}
          tone="info"
          icon={<MousePointerClick className="size-4" />}
          loading={loading}
        />
        <KpiCard
          label="CTR"
          value={`${ctr.toFixed(2)}%`}
          hint="Clics / impressions"
          tone="warning"
          icon={<TrendingUp className="size-4" />}
          loading={loading}
        />
        <KpiCard
          label="Audience live"
          value={selectedStreamId ? fmt(liveViewers) : "-"}
          hint={selectedStreamId ? (liveStatus === "live" ? "Audience sur 35 secondes" : "Synchronisation...") : "Sélectionnez une diffusion"}
          tone="success"
          icon={<Radio className="size-4" />}
          loading={loading}
        />
      </KpiRow>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Performance</CardTitle>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
              {summary && "ok" in summary && summary.ok ? `Depuis ${new Date(summary.since).toLocaleString("fr-FR")}` : "--"}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-[320px] items-center justify-center gap-2 text-sm text-slate-400">
                <Loader2 className="size-4 animate-spin" />
                Chargement...
              </div>
            ) : summary && "ok" in summary && summary.ok ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="10%" stopColor="#4f8fff" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#4f8fff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="clkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="10%" stopColor="#14b8a6" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="timeLabel" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(10,16,24,0.96)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#E2E8F0",
                        fontSize: "12px",
                        borderRadius: "18px",
                      }}
                    />
                    <Area type="monotone" dataKey="impressions" stroke="#4f8fff" strokeWidth={2} fill="url(#impGrad)" />
                    <Area type="monotone" dataKey="clicks" stroke="#14b8a6" strokeWidth={2} fill="url(#clkGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[320px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-400">
                Données indisponibles.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top campagnes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="size-4 animate-spin" />
                Synchronisation...
              </div>
            ) : topCampaigns.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-400">
                Aucune campagne.
              </div>
            ) : (
              topCampaigns.map((campaign) => (
                <div key={campaign.campaign_id} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{campaign.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Type {campaign.type} / Priorité {campaign.priority}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-slate-300">{campaign.ctr.toFixed(2)}%</div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2">
                      Impressions <span className="font-semibold text-white">{fmt(campaign.impressions)}</span>
                    </div>
                    <div className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2">
                      Clics <span className="font-semibold text-white">{fmt(campaign.clicks)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Activité récente</CardTitle>
          <div className="text-xs text-slate-500">
            {counters.lastEventAt ? `Dernier événement ${new Date(counters.lastEventAt).toLocaleTimeString("fr-FR")}` : "--"}
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-400">
              Aucune activité récente.
            </div>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 25).map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-sm text-white">{eventLabel(event.event)}</div>
                  <div className="text-xs text-slate-500">{new Date(event.created_at).toLocaleTimeString("fr-FR")}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

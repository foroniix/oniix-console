"use client";

import * as React from "react";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Monitor,
  Radio,
  RefreshCw,
  Smartphone,
  Tablet,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useConsoleIdentity } from "@/components/layout/console-identity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAnalyticsLiveSnapshot } from "@/lib/realtime/useAnalyticsLiveSnapshot";
import { cn } from "@/lib/utils";

type Period = "24h" | "7d" | "30d";

type ChannelRecord = {
  id: string;
  name: string;
  category?: string | null;
};

type StreamRecord = {
  id: string;
  title?: string | null;
  channel_id?: string | null;
};

type DashboardData = {
  traffic: Array<{ time: string; viewers: number }>;
  devices: Array<{ name: string; value: number }>;
  platforms: Array<{
    name: string;
    value: number;
    sessions: number;
    watchTime: number;
    watchTimeSeconds?: number;
    watchTimeLabel?: string;
  }>;
  kpi: {
    totalUsers: number;
    totalEvents: number;
    watchTime: number;
    watchTimeSeconds?: number;
    watchTimeLabel?: string;
    retention: number;
  };
  recentEvents: Array<{ message: string; time: string }>;
  live: {
    activeUsers: number;
    currentStreams: Record<string, number>;
  };
};

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "24h", label: "24 h" },
  { value: "7d", label: "7 j" },
  { value: "30d", label: "30 j" },
];

const PLATFORM_COLORS: Record<string, string> = {
  "App mobile": "#2563EB",
  Web: "#14B8A6",
};

const DEVICE_COLORS: Record<string, string> = {
  Mobile: "#2563EB",
  Desktop: "#7C3AED",
  Tablet: "#14B8A6",
};

const panelClass =
  "rounded-[28px] border border-slate-200/80 bg-white/85 shadow-[0_20px_55px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none";

function createEmptyDashboardData(): DashboardData {
  return {
    traffic: [],
    devices: [],
    platforms: [],
    kpi: {
      totalUsers: 0,
      totalEvents: 0,
      watchTime: 0,
      watchTimeSeconds: 0,
      watchTimeLabel: "0s",
      retention: 0,
    },
    recentEvents: [],
    live: { activeUsers: 0, currentStreams: {} },
  };
}

function isDashboardData(value: unknown): value is DashboardData {
  if (!value || typeof value !== "object") return false;
  return "traffic" in value && "devices" in value && "platforms" in value && "kpi" in value;
}

function safeNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.max(0, safeNumber(value)));
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Math.max(0, safeNumber(value)));
}

function formatPercent(value: number) {
  return `${Math.round(Math.max(0, safeNumber(value)))}%`;
}

function formatWatchTime(label?: string | null, minutes?: number, seconds?: number) {
  const trimmed = label?.trim();
  if (trimmed) return trimmed;

  const totalSeconds = safeNumber(seconds) > 0 ? safeNumber(seconds) : safeNumber(minutes) * 60;
  if (totalSeconds <= 0) return "0s";
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;

  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.round(totalSeconds % 60);

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return mins < 10 && secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatSyncClock(iso: string | null | undefined) {
  const parsed = Date.parse(iso ?? "");
  if (!Number.isFinite(parsed)) return "--:--:--";
  return new Date(parsed).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatRelativeDuration(iso: string | null | undefined) {
  const parsed = Date.parse(iso ?? "");
  if (!Number.isFinite(parsed)) return "à l'instant";

  const diffSeconds = Math.max(0, Math.round((Date.now() - parsed) / 1000));
  if (diffSeconds < 10) return "à l'instant";
  if (diffSeconds < 60) return `il y a ${diffSeconds}s`;

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `il y a ${minutes}m`;
  return `il y a ${Math.floor(minutes / 60)}h`;
}

function deviceIcon(name: string) {
  if (name === "Mobile") return Smartphone;
  if (name === "Tablet") return Tablet;
  return Monitor;
}

function liveStatusMeta(
  status: "idle" | "connecting" | "live" | "fallback" | "error",
  transport: "sse" | "poll" | "none"
) {
  if (status === "live" && transport === "sse") {
    return {
      label: "Flux temps réel",
      className:
        "border-emerald-300/80 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
      detail: "Signal direct actif.",
    };
  }

  if (status === "fallback" || transport === "poll") {
    return {
      label: "Mode secours 5s",
      className:
        "border-sky-300/80 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300",
      detail: "Le live repasse en polling court.",
    };
  }

  if (status === "error") {
    return {
      label: "Synchronisation dégradée",
      className:
        "border-amber-300/80 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300",
      detail: "Le dashboard continue en mode secours.",
    };
  }

  return {
    label: "Connexion live",
    className:
      "border-slate-300/80 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
    detail: "Ouverture du flux live.",
  };
}

function MetricCard(props: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  const Icon = props.icon;

  return (
    <div className="rounded-2xl border border-white/50 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {props.label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {props.value}
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{props.detail}</div>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl border"
          style={{ backgroundColor: `${props.accent}15`, color: props.accent, borderColor: `${props.accent}33` }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { workspaceId, workspaceName, role, loading: workspaceLoading, switchingWorkspaceId } =
    useConsoleIdentity();

  const [period, setPeriod] = React.useState<Period>("24h");
  const [selectedChannelId, setSelectedChannelId] = React.useState("all");
  const [channels, setChannels] = React.useState<ChannelRecord[]>([]);
  const [streams, setStreams] = React.useState<StreamRecord[]>([]);
  const [data, setData] = React.useState<DashboardData>(createEmptyDashboardData);
  const [error, setError] = React.useState<string | null>(null);
  const [loadingRefs, setLoadingRefs] = React.useState(false);
  const [loadingStats, setLoadingStats] = React.useState(false);
  const [refreshTick, setRefreshTick] = React.useState(0);
  const [lastLoadedAt, setLastLoadedAt] = React.useState<string | null>(null);

  const deferredPeriod = React.useDeferredValue(period);
  const deferredChannelId = React.useDeferredValue(selectedChannelId);
  const chartId = React.useId();
  const activeChannelId = deferredChannelId !== "all" ? deferredChannelId : null;

  const { snapshot, status, transport, refresh } = useAnalyticsLiveSnapshot({
    channelId: activeChannelId,
    enabled: Boolean(workspaceId),
  });

  React.useEffect(() => {
    if (workspaceLoading) return;
    if (!workspaceId) {
      setChannels([]);
      setStreams([]);
      setData(createEmptyDashboardData());
      setError("Aucun espace de travail actif.");
      return;
    }

    let cancelled = false;
    setLoadingRefs(true);
    setError(null);

    void (async () => {
      try {
        const [channelsRes, streamsRes] = await Promise.all([
          fetch("/api/channels", { cache: "no-store" }),
          fetch("/api/streams", { cache: "no-store" }),
        ]);
        const channelsJson = (await channelsRes.json().catch(() => null)) as ChannelRecord[] | null;
        const streamsJson = (await streamsRes.json().catch(() => null)) as StreamRecord[] | null;

        if (!channelsRes.ok || !Array.isArray(channelsJson)) throw new Error("Impossible de charger les chaînes.");
        if (!streamsRes.ok || !Array.isArray(streamsJson)) throw new Error("Impossible de charger les flux.");
        if (cancelled) return;

        setChannels(channelsJson);
        setStreams(streamsJson);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Impossible de charger l'analytics.");
        }
      } finally {
        if (!cancelled) setLoadingRefs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, workspaceLoading, refreshTick]);

  React.useEffect(() => {
    if (selectedChannelId === "all") return;
    if (channels.some((channel) => channel.id === selectedChannelId)) return;
    setSelectedChannelId("all");
  }, [channels, selectedChannelId]);

  React.useEffect(() => {
    if (workspaceLoading || !workspaceId) return;

    let cancelled = false;
    setLoadingStats(true);
    setError(null);

    void (async () => {
      try {
        const params = new URLSearchParams({ period: deferredPeriod });
        if (activeChannelId) params.set("channelId", activeChannelId);

        const res = await fetch(`/api/analytics/stats?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as unknown;

        if (!res.ok || !isDashboardData(json)) {
          throw new Error("Impossible de charger le tableau analytics.");
        }

        if (cancelled) return;

        setData({
          traffic: Array.isArray(json.traffic) ? json.traffic : [],
          devices: Array.isArray(json.devices) ? json.devices : [],
          platforms: Array.isArray(json.platforms) ? json.platforms : [],
          kpi: {
            totalUsers: safeNumber(json.kpi?.totalUsers),
            totalEvents: safeNumber(json.kpi?.totalEvents),
            watchTime: safeNumber(json.kpi?.watchTime),
            watchTimeSeconds: safeNumber(json.kpi?.watchTimeSeconds),
            watchTimeLabel: json.kpi?.watchTimeLabel ?? "0s",
            retention: safeNumber(json.kpi?.retention),
          },
          recentEvents: Array.isArray(json.recentEvents) ? json.recentEvents : [],
          live: {
            activeUsers: safeNumber(json.live?.activeUsers),
            currentStreams: json.live?.currentStreams ?? {},
          },
        });
        setLastLoadedAt(new Date().toISOString());
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Impossible de charger l'analytics.");
        }
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, workspaceLoading, deferredPeriod, activeChannelId, refreshTick]);

  const selectedChannel = React.useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  );

  const channelMap = React.useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel])),
    [channels]
  );

  const streamMap = React.useMemo(
    () => new Map(streams.map((stream) => [stream.id, stream])),
    [streams]
  );

  const livePayload = snapshot?.live ?? data.live;
  const liveMeta = liveStatusMeta(status, transport);
  const trafficGradientId = `${chartId}-traffic`;
  const devicePieId = `${chartId}-devices`;

  const platformData = React.useMemo(() => {
    const current = new Map(data.platforms.map((entry) => [entry.name, entry]));
    return ["App mobile", "Web"].map((name) => {
      const entry = current.get(name);
      return {
        name,
        value: safeNumber(entry?.value),
        sessions: safeNumber(entry?.sessions),
        watchTimeLabel: formatWatchTime(entry?.watchTimeLabel, entry?.watchTime, entry?.watchTimeSeconds),
        color: PLATFORM_COLORS[name] ?? "#64748B",
      };
    });
  }, [data.platforms]);

  const deviceData = React.useMemo(() => {
    const current = new Map(data.devices.map((entry) => [entry.name, entry.value]));
    return ["Mobile", "Desktop", "Tablet"].map((name) => ({
      name,
      value: safeNumber(current.get(name)),
      color: DEVICE_COLORS[name] ?? "#64748B",
    }));
  }, [data.devices]);

  const liveStreams = React.useMemo(() => {
    return Object.entries(livePayload.currentStreams ?? {})
      .map(([streamId, viewers]) => {
        const stream = streamMap.get(streamId);
        const channel = channelMap.get(stream?.channel_id ?? "");
        return {
          id: streamId,
          title: stream?.title?.trim() || channel?.name || "Flux live",
          channelName: channel?.name || selectedChannel?.name || "Canal non resolu",
          viewers: safeNumber(viewers),
        };
      })
      .sort((left, right) => right.viewers - left.viewers)
      .slice(0, 6);
  }, [channelMap, livePayload.currentStreams, selectedChannel?.name, streamMap]);

  const liveSessions = React.useMemo(() => {
    const sessions = snapshot?.sessions ?? [];
    return sessions.slice(0, 6).map((session) => {
      const stream = session.stream_id ? streamMap.get(session.stream_id) : null;
      const channel = channelMap.get(stream?.channel_id ?? "");
      return {
        id: session.session_id,
        title: stream?.title?.trim() || channel?.name || "Session live",
        deviceType: session.device_type?.trim() || "desktop",
        lastSeenAt: session.last_seen_at,
      };
    });
  }, [channelMap, snapshot?.sessions, streamMap]);

  const averageWatchSeconds =
    data.kpi.totalUsers > 0 ? safeNumber(data.kpi.watchTimeSeconds) / Math.max(1, data.kpi.totalUsers) : 0;
  const leadingPlatform =
    platformData.find((entry) => entry.sessions > 0) ?? platformData[0] ?? { name: "Web", value: 0, sessions: 0, watchTimeLabel: "0s", color: "#64748B" };
  const dominantDevice =
    deviceData.reduce((best, current) => (current.value > best.value ? current : best), deviceData[0] ?? {
      name: "Desktop",
      value: 0,
      color: "#64748B",
    });
  const busy = workspaceLoading || loadingRefs || loadingStats || Boolean(switchingWorkspaceId);

  const handleRefresh = React.useCallback(() => {
    setRefreshTick((value) => value + 1);
    void refresh();
  }, [refresh]);

  if (workspaceLoading) {
    return (
      <div className="space-y-6">
        <div className="h-72 animate-pulse rounded-[28px] bg-slate-200/70 dark:bg-white/5" />
        <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <div className="h-[420px] animate-pulse rounded-[28px] bg-slate-200/70 dark:bg-white/5" />
          <div className="h-[420px] animate-pulse rounded-[28px] bg-slate-200/70 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_30%),linear-gradient(180deg,#ffffff,rgba(248,250,252,0.98))] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.14),transparent_30%),linear-gradient(180deg,rgba(10,14,24,0.98),rgba(10,14,24,0.94))] dark:shadow-none">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-slate-200 bg-white/80 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
                Audience
              </Badge>
              <Badge className={cn("border", liveMeta.className)}>
                <Wifi className="mr-1 h-3 w-3" />
                {liveMeta.label}
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-white/80 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                Espace - {workspaceName}
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-4xl">
              Pilotage audience
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Vue consolidée de l&apos;audience, du visionnage et du direct multi-chaînes.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                {activeChannelId ? `Filtre - ${selectedChannel?.name ?? "Chaîne sélectionnée"}` : "Vue d'ensemble"}
              </div>
              <div className="rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                Rôle - {role}
              </div>
              <div className="rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                Synchro - {formatSyncClock(snapshot?.asOf ?? lastLoadedAt)}
              </div>
            </div>
          </div>

          <div className="w-full max-w-xl rounded-[28px] border border-white/50 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.05] xl:ml-6">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Periode
                </div>
                <div className="flex rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-white/[0.04]">
                  {PERIOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPeriod(option.value)}
                      aria-pressed={period === option.value}
                      className={cn(
                        "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition",
                        period === option.value
                          ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                          : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Chaine
                </div>
                <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                  <SelectTrigger className="h-11 w-full rounded-2xl border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
                    <SelectValue placeholder="Toutes les chaînes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les chaînes</SelectItem>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-2xl border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                  onClick={handleRefresh}
                  disabled={busy}
                >
                  <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
                  Actualiser
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          <MetricCard
            label="Utilisateurs"
            value={formatCompact(data.kpi.totalUsers)}
            detail={`${formatNumber(data.kpi.totalUsers)} sessions observees`}
            icon={Users}
            accent="#2563EB"
          />
          <MetricCard
            label="Temps de visionnage"
            value={formatWatchTime(data.kpi.watchTimeLabel, data.kpi.watchTime, data.kpi.watchTimeSeconds)}
            detail={`${formatWatchTime(undefined, 0, averageWatchSeconds)} par utilisateur`}
            icon={Clock3}
            accent="#14B8A6"
          />
          <MetricCard
            label="Retention"
            value={formatPercent(data.kpi.retention)}
            detail="Sessions qui depassent le seuil de retention"
            icon={Zap}
            accent="#7C3AED"
          />
          <MetricCard
            label="Direct maintenant"
            value={formatCompact(livePayload.activeUsers)}
            detail={`${formatNumber(liveStreams.length)} flux actifs visibles`}
            icon={Radio}
            accent="#F59E0B"
          />
        </div>
      </section>

      {error ? (
        <Card className={cn(panelClass, "border-red-200/80 dark:border-red-400/20")}>
          <CardContent className="flex items-start gap-3 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-slate-950 dark:text-white">Chargement incomplet</div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className={panelClass}>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-xl text-slate-950 dark:text-white">Acquisition et engagement</CardTitle>
              <CardDescription className="mt-1 text-slate-600 dark:text-slate-300">
                Tendance d&apos;audience et intensité d&apos;usage.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  {formatNumber(data.kpi.totalEvents)} événements
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Utilisateurs</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatNumber(data.kpi.totalUsers)}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">base analytique sur la periode</div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Temps de visionnage</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatWatchTime(data.kpi.watchTimeLabel, data.kpi.watchTime, data.kpi.watchTimeSeconds)}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">moyenne session - {formatWatchTime(undefined, 0, averageWatchSeconds)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Intensite</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {data.kpi.totalUsers > 0 ? (data.kpi.totalEvents / data.kpi.totalUsers).toFixed(1) : "0.0"}
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">événements par utilisateur</div>
              </div>
            </div>

            <div className="h-[320px] w-full">
              {data.traffic.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.traffic} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id={trafficGradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.36} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ stroke: "#2563EB", strokeDasharray: "4 4" }}
                      contentStyle={{ borderRadius: 18, border: "1px solid rgba(148,163,184,0.24)", background: "rgba(255,255,255,0.95)" }}
                      formatter={(value: number | string | undefined) => [formatNumber(safeNumber(value)), "Utilisateurs"]}
                    />
                    <Area type="monotone" dataKey="viewers" stroke="#2563EB" strokeWidth={3} fill={`url(#${trafficGradientId})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  Aucun historique exploitable sur cette fenetre.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-slate-950 dark:text-white">Centre live</CardTitle>
              <CardDescription className="mt-1 text-slate-600 dark:text-slate-300">
                Vue web + mobile sur la fenêtre live.
              </CardDescription>
              </div>
              <Badge className={cn("border", liveMeta.className)}>{liveMeta.label}</Badge>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">{liveMeta.detail}</div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[26px] bg-slate-950 p-5 text-white dark:bg-[#050816]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Audience live</div>
                  <div className="mt-2 text-4xl font-semibold tracking-tight">{formatNumber(livePayload.activeUsers)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Radio className="h-6 w-6 text-cyan-300" />
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Flux actifs</div>
                  <div className="mt-2 text-2xl font-semibold">{formatNumber(liveStreams.length)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Dernier point</div>
                  <div className="mt-2 text-2xl font-semibold">{formatSyncClock(snapshot?.asOf ?? lastLoadedAt)}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {liveStreams.length > 0 ? (
                liveStreams.map((stream) => (
                  <div key={stream.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900 dark:text-white">{stream.title}</div>
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">{stream.channelName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-950 dark:text-white">{formatNumber(stream.viewers)}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">live</div>
                      </div>
                    </div>
                    <Progress
                      value={Math.round((stream.viewers / Math.max(1, livePayload.activeUsers)) * 100)}
                      className="h-2 bg-slate-100 dark:bg-white/10"
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  Aucun flux live actif pour le filtre courant.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr_1fr]">
        <Card className={panelClass}>
          <CardHeader>
            <CardTitle className="text-xl text-slate-950 dark:text-white">Sources de lecture</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Répartition des sessions et du temps de visionnage par plateforme.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 18, border: "1px solid rgba(148,163,184,0.24)", background: "rgba(255,255,255,0.95)" }}
                    formatter={(value: number | string | undefined) => [formatNumber(safeNumber(value)), "Sessions"]}
                  />
                  <Bar dataKey="sessions" radius={[10, 10, 0, 0]}>
                    {platformData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {platformData.map((entry) => (
                <div key={entry.name} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-950 dark:text-white">{entry.name}</div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {formatPercent(entry.value)} des sessions - {formatNumber(entry.sessions)} utilisateurs
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-950 dark:text-white">{entry.watchTimeLabel}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">temps cumule</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader>
            <CardTitle className="text-xl text-slate-950 dark:text-white">Appareils</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Distribution des sessions par type d&apos;equipement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id={devicePieId} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#14B8A6" />
                    </linearGradient>
                  </defs>
                  <Pie data={deviceData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                    {deviceData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 18, border: "1px solid rgba(148,163,184,0.24)", background: "rgba(255,255,255,0.95)" }}
                    formatter={(value: number | string | undefined) => [`${formatPercent(safeNumber(value))}`, "Part"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {deviceData.map((entry) => {
                const Icon = deviceIcon(entry.name);
                return (
                  <div key={entry.name} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: `${entry.color}18`, color: entry.color }}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-950 dark:text-white">{entry.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">part de sessions</div>
                        </div>
                      </div>
                      <div className="font-semibold text-slate-950 dark:text-white">{formatPercent(entry.value)}</div>
                    </div>
                    <Progress value={entry.value} className="h-2 bg-slate-100 dark:bg-white/10" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader>
            <CardTitle className="text-xl text-slate-950 dark:text-white">Signal recent</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Activité récente et signaux clés.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Plateforme dominante</div>
                <div className="mt-2 flex items-end gap-2">
                  <div className="text-2xl font-semibold text-slate-950 dark:text-white">{leadingPlatform.name}</div>
                  <ArrowUpRight className="mb-1 h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {formatPercent(leadingPlatform.value)} des sessions - {leadingPlatform.watchTimeLabel} cumules
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Appareil principal</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{dominantDevice.name}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatPercent(dominantDevice.value)} du trafic observe</div>
              </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-white/10" />

            <div className="space-y-3">
              {liveSessions.length > 0 ? (
                liveSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900 dark:text-white">{session.title}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">{session.deviceType}</div>
                    </div>
                    <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                      {formatRelativeDuration(session.lastSeenAt)}
                    </div>
                  </div>
                ))
              ) : data.recentEvents.length > 0 ? (
                data.recentEvents.slice(0, 6).map((event, index) => (
                  <div key={`${event.message}-${event.time}-${index}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900 dark:text-white">{event.message}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{event.time}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  Aucune activité récente pour le filtre courant.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

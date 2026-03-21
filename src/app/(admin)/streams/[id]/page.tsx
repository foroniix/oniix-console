"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Copy,
  Loader2,
  MonitorPlay,
  Pause,
  Play,
  RefreshCw,
  Save,
  ShieldAlert,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";

import HlsPlayer from "@/components/HlsPlayer";
import { DataTableShell } from "@/components/console/data-table-shell";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { StatusBadge } from "@/components/console/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  endLiveAndCreateReplay,
  getStream,
  setStreamStatus,
  upsertStream,
  type Stream,
} from "@/lib/data";

type ValidationCheck = { key: string; label: string; status: "OK" | "WARN" | "FAIL"; message: string };
type ValidationResult = {
  ok: true;
  validatedAt: string;
  summary: "OK" | "WARN" | "FAIL";
  checks: ValidationCheck[];
  metrics: { variantsCount: number; audioTracks: number; subtitleTracks: number; segmentErrorCount: number };
  incidents?: string[];
};
type AnalyticsResult = {
  ok: true;
  current: { viewers: number; bitrateKbps: number; errors: number; updatedAt: string | null };
  summary: { viewersAvg1h: number; viewersPeak24h: number; bitrateAvg1h: number; errors1h: number; errors24h: number };
  series24h: Array<{ ts: string; viewers: number; bitrateKbps: number; errors: number }>;
};
type ReplayProcessResult = {
  ok?: boolean;
  done?: number;
  failed?: number;
  processed?: Array<{ jobId: string; replayId: string; status: "done" | "failed"; message: string }>;
};
type AuditItem = { id: string; at: string; action: string; details: string; actor: string };
type AuditApiRow = {
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};
type StreamConfig = {
  title: string;
  hlsUrl: string;
  latency: "normal" | "low" | "ultra-low";
  dvrEnabled: boolean;
  dvrWindowSec: number;
  timeshift: boolean;
  drmEnabled: boolean;
  geoAllow: string;
  geoBlock: string;
  captionsText: string;
};

type DrmProvider = "none" | "widevine" | "fairplay" | "multi";

type DrmConfig = {
  provider: DrmProvider;
  widevineLicenseUrl: string;
  fairplayLicenseUrl: string;
  fairplayCertificateUrl: string;
};

const PRESETS: Record<string, Partial<StreamConfig>> = {
  standard: { latency: "normal", dvrEnabled: false, dvrWindowSec: 0, timeshift: true, drmEnabled: false },
  low: { latency: "low", dvrEnabled: false, dvrWindowSec: 0, timeshift: true, drmEnabled: false },
  dvr: { latency: "normal", dvrEnabled: true, dvrWindowSec: 21600, timeshift: true, drmEnabled: false },
  sport: { latency: "low", dvrEnabled: true, dvrWindowSec: 7200, timeshift: true, drmEnabled: true },
};

const PRESET_LABELS: Record<string, string> = {
  standard: "Standard",
  low: "Faible latence",
  dvr: "Avec DVR",
  sport: "Sport",
};

const DEFAULT_DRM_CONFIG: DrmConfig = {
  provider: "none",
  widevineLicenseUrl: "",
  fairplayLicenseUrl: "",
  fairplayCertificateUrl: "",
};

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function dateLabel(value?: string | null) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString();
}

function toLocalDateTimeInput(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function parseDateTimeInput(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function toRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function compactValue(value: unknown) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseStoredDrmConfig(raw: string): DrmConfig {
  try {
    const parsed = JSON.parse(raw) as Partial<DrmConfig>;
    const provider =
      parsed.provider === "widevine" ||
      parsed.provider === "fairplay" ||
      parsed.provider === "multi" ||
      parsed.provider === "none"
        ? parsed.provider
        : "none";
    return {
      provider,
      widevineLicenseUrl: typeof parsed.widevineLicenseUrl === "string" ? parsed.widevineLicenseUrl : "",
      fairplayLicenseUrl: typeof parsed.fairplayLicenseUrl === "string" ? parsed.fairplayLicenseUrl : "",
      fairplayCertificateUrl:
        typeof parsed.fairplayCertificateUrl === "string" ? parsed.fairplayCertificateUrl : "",
    };
  } catch {
    return DEFAULT_DRM_CONFIG;
  }
}

function buildConfig(stream: Stream): StreamConfig {
  return {
    title: stream.title,
    hlsUrl: stream.hlsUrl,
    latency: stream.latency ?? "normal",
    dvrEnabled: (stream.dvrWindowSec ?? 0) > 0,
    dvrWindowSec: stream.dvrWindowSec ?? 0,
    timeshift: stream.record ?? true,
    drmEnabled: stream.drm ?? false,
    geoAllow: (stream.geo?.allow ?? []).join(", "),
    geoBlock: (stream.geo?.block ?? []).join(", "),
    captionsText: (stream.captions ?? []).map((c) => `${c.lang}|${c.url}`).join("\n"),
  };
}

export default function StreamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [stream, setStream] = useState<Stream | null>(null);
  const [config, setConfig] = useState<StreamConfig | null>(null);
  const [drmConfig, setDrmConfig] = useState<DrmConfig>(DEFAULT_DRM_CONFIG);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [incidents, setIncidents] = useState<string[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [geoProbe, setGeoProbe] = useState("");
  const [clipStartAt, setClipStartAt] = useState("");
  const [clipEndAt, setClipEndAt] = useState("");
  const [clipEndStream, setClipEndStream] = useState(false);
  const [clipSubmitting, setClipSubmitting] = useState(false);
  const [clipQueueRunning, setClipQueueRunning] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [configDirty, setConfigDirty] = useState(false);
  const previousSummaryRef = useRef<ValidationResult["summary"] | null>(null);

  const addAudit = useCallback((action: string, details: string, actor = "operator") => {
    const at = new Date().toISOString();
    setAudit((prev) => [{ id: `${action}-${at}`, at, action, details, actor }, ...prev]);
  }, []);

  const patchConfig = useCallback((patch: Partial<StreamConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));
    setConfigDirty(true);
  }, []);

  const loadStream = useCallback(async () => {
    const current = await getStream(id);
    setStream(current);
    setConfig(buildConfig(current));
  }, [id]);

  const loadAnalytics = useCallback(
    async (soft = false) => {
      if (!soft) setAnalyticsLoading(true);
      try {
        const response = await fetch(`/api/streams/${id}/analytics`, { cache: "no-store" });
        const json = (await response.json().catch(() => null)) as AnalyticsResult | null;
        if (response.ok && json?.ok) setAnalytics(json);
      } finally {
        setAnalyticsLoading(false);
      }
    },
    [id]
  );

  const loadAudit = useCallback(async () => {
    try {
      const response = await fetch(`/api/streams/${id}/audit?limit=80`, { cache: "no-store" });
      const json = (await response.json().catch(() => null)) as
        | { ok: true; logs: AuditApiRow[] }
        | { ok?: false; error?: string }
        | null;
      if (!response.ok || !json || !("ok" in json) || !json.ok) return;

      const mapped = (json.logs ?? []).map((row) => {
        const metadata = toRecord(row.metadata) ?? {};
        const diff = toRecord(metadata.diff);
        const incidentLines = Array.isArray(metadata.incidents)
          ? (metadata.incidents.filter((item) => typeof item === "string") as string[])
          : [];

        let details = "";
        if (diff && Object.keys(diff).length > 0) {
          details = Object.entries(diff)
            .slice(0, 4)
            .map(([field, delta]) => {
              const pair = toRecord(delta);
              return `${field}: ${compactValue(pair?.before)} -> ${compactValue(pair?.after)}`;
            })
            .join(" | ");
        } else if (incidentLines.length > 0) {
          details = incidentLines.slice(0, 2).join(" | ");
        } else {
          details = `Action ${row.action.toLowerCase()} exécutée`;
        }

        return {
          id: row.id,
          at: row.created_at,
          action: row.action,
          details,
          actor: row.actor_user_id || "system",
        };
      });

      setAudit(mapped);

      const asNumber = (value: unknown) => {
        const n = Number(value ?? 0);
        return Number.isFinite(n) ? n : 0;
      };

      const validationRows = (json.logs ?? [])
        .filter((row) => row.action === "STREAM_VALIDATE_HLS")
        .map((row) => {
          const metadata = toRecord(row.metadata) ?? {};
          const summary = typeof metadata.summary === "string" ? metadata.summary.toUpperCase() : "";
          if (summary !== "OK" && summary !== "WARN" && summary !== "FAIL") return null;
          const incidents = Array.isArray(metadata.incidents)
            ? (metadata.incidents.filter((item) => typeof item === "string") as string[])
            : [];
          const checks = Array.isArray(metadata.checks) ? metadata.checks : [];
          const metrics = toRecord(metadata.metrics) ?? {};
          return {
            at: typeof metadata.validatedAt === "string" ? metadata.validatedAt : row.created_at,
            summary: summary as ValidationResult["summary"],
            incidents,
            checks: checks
              .map((item, index) => {
                const check = toRecord(item);
                const status = typeof check?.status === "string" ? check.status.toUpperCase() : "";
                if (status !== "OK" && status !== "WARN" && status !== "FAIL") return null;
                return {
                  key: typeof check?.key === "string" ? check.key : `check-${index}`,
                  label: typeof check?.label === "string" ? check.label : `Check ${index + 1}`,
                  status: status as ValidationCheck["status"],
                  message: typeof check?.message === "string" ? check.message : "",
                } satisfies ValidationCheck;
              })
              .filter((item): item is ValidationCheck => item !== null),
            metrics: {
              variantsCount: asNumber(metrics.variantsCount),
              audioTracks: asNumber(metrics.audioTracks),
              subtitleTracks: asNumber(metrics.subtitleTracks),
              segmentErrorCount: asNumber(metrics.segmentErrorCount),
            },
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => (a.at > b.at ? 1 : -1));

      const latestValidation = validationRows.at(-1);
      if (latestValidation) {
        setValidation({
          ok: true,
          validatedAt: latestValidation.at,
          summary: latestValidation.summary,
          checks: latestValidation.checks,
          metrics: latestValidation.metrics,
          incidents: latestValidation.incidents,
        });
        previousSummaryRef.current = latestValidation.summary;
      }

      const timeline: string[] = [];
      let previous: ValidationResult["summary"] | null = null;

      for (const row of validationRows) {
        if ((row.summary === "WARN" || row.summary === "FAIL") && (!previous || previous === "OK")) {
          timeline.push(
            `${dateLabel(row.at)} - incident détecté${row.incidents[0] ? ` - ${row.incidents[0]}` : ""}`
          );
        } else if (row.summary === "OK" && previous && previous !== "OK") {
          timeline.push(`${dateLabel(row.at)} - incident résolu`);
        }
        previous = row.summary;
      }

      if (timeline.length === 0) {
        const warnings = validationRows
          .filter((row) => row.summary !== "OK")
          .slice(-5)
          .map(
            (row) =>
              `${dateLabel(row.at)} - ${row.summary}${row.incidents[0] ? ` - ${row.incidents[0]}` : ""}`
          );
        setIncidents(warnings.reverse());
      } else {
        setIncidents(timeline.reverse().slice(0, 20));
      }
    } catch {
      // ignore
    }
  }, [id]);

  const runValidation = useCallback(async () => {
    setValidating(true);
    try {
      const response = await fetch(`/api/streams/${id}/validate`, { method: "POST" });
      const json = (await response.json().catch(() => null)) as ValidationResult | { error?: string } | null;
      if (!response.ok || !json || !("ok" in json) || !json.ok) {
        setFeedback((json && "error" in json && json.error) || "Validation HLS impossible.");
        return;
      }
      setValidation(json);
      setFeedback(`Validation HLS terminee (${json.summary}).`);
      const issue =
        json.incidents?.[0] ?? json.checks.find((check) => check.status !== "OK")?.message ?? "Vérification requise";
      if ((json.summary === "WARN" || json.summary === "FAIL") && (!previousSummaryRef.current || previousSummaryRef.current === "OK")) {
        setIncidents((prev) => [`${dateLabel(json.validatedAt)} - incident détecté - ${issue}`, ...prev]);
      }
      if (json.summary === "OK" && previousSummaryRef.current && previousSummaryRef.current !== "OK") {
        setIncidents((prev) => [`${dateLabel(json.validatedAt)} - incident résolu`, ...prev]);
      }
      previousSummaryRef.current = json.summary;
      addAudit("VALIDATE_HLS", `Validation ${json.summary}`);
      void loadAudit();
    } finally {
      setValidating(false);
    }
  }, [addAudit, id, loadAudit]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Promise.all([loadStream(), loadAnalytics(false), loadAudit()]);
        if (mounted) setLastRefreshAt(new Date().toISOString());
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadAnalytics, loadAudit, loadStream]);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 15 * 60 * 1000);
    setClipStartAt(toLocalDateTimeInput(start));
    setClipEndAt(toLocalDateTimeInput(now));
    setClipEndStream(false);
  }, [id]);

  useEffect(() => {
    if (!autoRefreshEnabled || tab === "config") return;

    const refresh = () => {
      if (document.hidden) return;
      void Promise.all([loadAnalytics(true), loadAudit()]).then(() => {
        setLastRefreshAt(new Date().toISOString());
      });
    };

    refresh();

    const onVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [autoRefreshEnabled, loadAnalytics, loadAudit, tab]);

  useEffect(() => {
    const storageKey = `stream:${id}:drm-config`;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setDrmConfig(DEFAULT_DRM_CONFIG);
        return;
      }
      setDrmConfig(parseStoredDrmConfig(raw));
    } catch {
      setDrmConfig(DEFAULT_DRM_CONFIG);
    }
  }, [id]);

  useEffect(() => {
    const storageKey = `stream:${id}:drm-config`;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(drmConfig));
    } catch {
      // ignore storage failures
    }
  }, [drmConfig, id]);

  const onSaveConfig = async () => {
    if (!stream || !config) return;
    setSaving(true);
    try {
      const next = await upsertStream({
        id: stream.id,
        title: config.title,
        hlsUrl: config.hlsUrl,
        latency: config.latency,
        dvrWindowSec: config.dvrEnabled ? config.dvrWindowSec : 0,
        record: config.timeshift,
        drm: config.drmEnabled,
        geo: { allow: parseList(config.geoAllow), block: parseList(config.geoBlock) },
        captions: config.captionsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [lang, second, third] = line.split("|").map((part) => part.trim());
            if (third) {
              return {
                lang: (lang || "und").trim(),
                label: second || undefined,
                url: third,
                kind: "subtitles" as const,
              };
            }
            return {
              lang: (lang || "und").trim(),
              url: (second || "").trim(),
              kind: "subtitles" as const,
            };
          })
          .filter((item) => item.url.length > 0),
      });
      setStream(next);
      setConfig(buildConfig(next));
      setConfigDirty(false);
      if (config.drmEnabled && drmConfig.provider !== "none") {
        setFeedback("Configuration enregistrée. Les endpoints DRM restent stockés localement tant que le backend dédié n’est pas activé.");
      } else {
        setFeedback("Configuration enregistrée.");
      }
      addAudit("UPDATE_CONFIG", "Configuration du flux mise à jour");
      void loadAudit();
    } catch {
      setFeedback("Impossible d'enregistrer la configuration.");
    } finally {
      setSaving(false);
    }
  };

  const onSetLive = async () => {
    if (!stream) return;
    const next = await setStreamStatus(stream.id, "LIVE");
    setStream(next);
    addAudit("SET_LIVE", "Flux passe en LIVE");
    void loadAudit();
  };

  const onStop = async () => {
    if (!stream) return;
    if (!confirm("Confirmer l’arrêt du flux ?")) return;
    const next = await setStreamStatus(stream.id, "OFFLINE");
    setStream(next);
    addAudit("STOP_STREAM", "Flux passe en OFFLINE");
    void loadAudit();
  };

  const onCreateReplayInstant = async () => {
    if (!stream) return;
    try {
      await endLiveAndCreateReplay(stream.id, { title: stream.title, endStream: true });
      setFeedback("Replay instantane cree (flux passe en ENDED).");
      addAudit("CREATE_REPLAY", "Replay instantane cree depuis live");
      void loadAudit();
    } catch {
      setFeedback("Impossible de creer le replay instantane.");
    }
  };

  const onCreateReplayClip = async () => {
    if (!stream) return;
    const clipStartIso = parseDateTimeInput(clipStartAt);
    const clipEndIso = parseDateTimeInput(clipEndAt);
    if (!clipStartIso || !clipEndIso || clipEndIso <= clipStartIso) {
      setFeedback("Fenêtre replay invalide. Vérifiez le début et la fin.");
      return;
    }

    setClipSubmitting(true);
    try {
      await endLiveAndCreateReplay(stream.id, {
        title: stream.title,
        clipStartAt: clipStartIso,
        clipEndAt: clipEndIso,
        sourceHlsUrl: stream.hlsUrl,
        replayStatus: "processing",
        endStream: clipEndStream,
      });

      addAudit("CREATE_REPLAY_CLIP", `Replay fenêtre ${dateLabel(clipStartIso)} -> ${dateLabel(clipEndIso)}`);

      const processRes = await fetch("/api/replays/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 1 }),
      });
      const processJson = (await processRes.json().catch(() => null)) as ReplayProcessResult | null;

      if (processRes.ok && processJson?.ok) {
        const done = Number(processJson.done ?? 0);
        const failed = Number(processJson.failed ?? 0);
        if (done > 0) {
          setFeedback("Replay clip genere et pret.");
        } else if (failed > 0) {
          setFeedback(processJson.processed?.[0]?.message || "Échec du clip replay.");
        } else {
          setFeedback("Replay clip cree en file d'attente.");
        }
      } else {
        setFeedback("Replay clip cree, traitement en file d'attente.");
      }
      void loadAudit();
    } catch {
      setFeedback("Impossible de creer le replay clip.");
    } finally {
      setClipSubmitting(false);
    }
  };

  const onProcessClipQueue = async () => {
    setClipQueueRunning(true);
    try {
      const response = await fetch("/api/replays/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 3 }),
      });
      const json = (await response.json().catch(() => null)) as ReplayProcessResult | null;
      if (!response.ok || !json?.ok) {
        setFeedback("Traitement des clips impossible.");
        return;
      }
      const done = Number(json.done ?? 0);
      const failed = Number(json.failed ?? 0);
      setFeedback(`Traitement des clips : ${done} terminé(s), ${failed} en échec.`);
      addAudit("PROCESS_REPLAY_CLIPS", `${done} done / ${failed} failed`);
      void loadAudit();
    } finally {
      setClipQueueRunning(false);
    }
  };

  const geoResult = useMemo(() => {
    if (!config || !geoProbe.trim()) return null;
    const country = geoProbe.trim().toUpperCase();
    const allow = parseList(config.geoAllow);
    const block = parseList(config.geoBlock);
    if (block.includes(country)) return { status: "DOWN", text: `${country} bloque` };
    if (allow.length > 0 && !allow.includes(country)) return { status: "DEGRADED", text: `${country} hors allowlist` };
    return { status: "HEALTHY", text: `${country} autorise` };
  }, [config, geoProbe]);

  const series = useMemo(() => (analytics?.series24h ?? []).slice(-20).reverse(), [analytics?.series24h]);
  const audits = useMemo(() => [...audit].sort((a, b) => (a.at > b.at ? -1 : 1)), [audit]);
  const healthCounts = useMemo(() => {
    const checks = validation?.checks ?? [];
    return {
      ok: checks.filter((check) => check.status === "OK").length,
      warn: checks.filter((check) => check.status === "WARN").length,
      fail: checks.filter((check) => check.status === "FAIL").length,
    };
  }, [validation?.checks]);

  if (loading || !stream || !config) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-slate-400">
        <Loader2 className="size-5 animate-spin" />
        Chargement...
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={stream.title}
        subtitle="Supervision du direct, qualité de diffusion, configuration sécurisée et journal d’exploitation."
        breadcrumbs={[{ label: "Oniix Console", href: "/dashboard" }, { label: "Directs", href: "/streams" }, { label: "Régie du flux" }]}
        actions={
          <>
            <StatusBadge status={stream.status} />
            <Button
              variant="outline"
              onClick={() => setAutoRefreshEnabled((value) => !value)}
              
            >
              {autoRefreshEnabled ? <Pause className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
              {autoRefreshEnabled ? "Suspendre l'actualisation" : "Reprendre l'actualisation"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void Promise.all([loadStream(), loadAnalytics(true), loadAudit()]).then(() => {
                  setLastRefreshAt(new Date().toISOString());
                });
              }}
              
            >
              <RefreshCw className="mr-2 size-4" />
              Actualiser
            </Button>
          </>
        }
      />

      {feedback ? <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">{feedback}</div> : null}

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-400">
        Actualisation auto : <span className="font-medium text-slate-100">{autoRefreshEnabled ? "ACTIVE" : "PAUSÉE"}</span>
        {" | "}
        Dernière synchro diagnostics : <span className="font-medium text-slate-100">{dateLabel(lastRefreshAt)}</span>
      </div>

      <KpiRow>
        <KpiCard label="Audience instantanée" value={analytics?.current.viewers ?? 0} tone="info" loading={analyticsLoading} />
        <KpiCard label="Audience moyenne 1 h" value={analytics?.summary.viewersAvg1h ?? 0} loading={analyticsLoading} />
        <KpiCard label="Pic 24 h" value={analytics?.summary.viewersPeak24h ?? 0} loading={analyticsLoading} />
        <KpiCard label="Bitrate moyen 1 h" value={`${analytics?.summary.bitrateAvg1h ?? 0} kbps`} loading={analyticsLoading} />
        <KpiCard label="Erreurs 24h" value={analytics?.summary.errors24h ?? 0} tone={(analytics?.summary.errors24h ?? 0) > 0 ? "warning" : "success"} loading={analyticsLoading} />
      </KpiRow>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList >
          <TabsTrigger value="overview">Supervision</TabsTrigger>
          <TabsTrigger value="health">Qualité</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="analytics">Audience</TabsTrigger>
          <TabsTrigger value="activity">Journal d’exploitation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <div className="console-panel overflow-hidden">
              <div className="aspect-video bg-black">
                <HlsPlayer
                  streamId={stream.id}
                  src={stream.hlsUrl}
                  muted={muted}
                  autoPlay
                  controls
                  className="h-full w-full"
                  onErrorChange={setPlayerError}
                  enableStatsIngest
                  statsIngestIntervalMs={15000}
                  statsIngestPaused={!autoRefreshEnabled}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
                <span className="text-xs text-slate-400">Dernière activité : {dateLabel(stream.updatedAt)}</span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setMuted((v) => !v)} >
                    {muted ? <VolumeX className="mr-2 size-4" /> : <Volume2 className="mr-2 size-4" />}
                    {muted ? "Activer le son" : "Couper le son"}
                  </Button>
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(stream.hlsUrl).catch(() => {})} >
                    <Copy className="mr-2 size-4" />
                    Copier URL manifest
                  </Button>
                  <Button onClick={() => void runValidation()} >
                    {validating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldAlert className="mr-2 size-4" />}
                    Valider HLS
                  </Button>
                </div>
              </div>
            </div>
            {playerError ? <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{playerError}</div> : null}
          </div>

          <div className="space-y-4">
            <div className="console-panel p-4">
              <h3 className="text-sm font-semibold">Actions opérateur</h3>
              <div className="mt-3 space-y-2">
                <Button onClick={onSetLive} disabled={stream.status === "LIVE"} className="w-full justify-start"><Play className="mr-2 size-4" />Passer en direct</Button>
                <Button onClick={onStop} disabled={stream.status !== "LIVE"} variant="outline" className="w-full justify-start"><Square className="mr-2 size-4" />Arrêter le flux</Button>
                <Button onClick={onCreateReplayInstant} variant="outline" className="w-full justify-start"><MonitorPlay className="mr-2 size-4" />Créer un replay instantané</Button>
              </div>
              <div className="mt-3 space-y-2 rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                <p className="text-xs text-slate-400">Clip replay sur flux continu : sélectionnez un début et une fin.</p>
                <div>
                  <Label className="text-xs text-slate-400">Début</Label>
                  <Input
                    type="datetime-local"
                    value={clipStartAt}
                    onChange={(event) => setClipStartAt(event.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Fin</Label>
                  <Input
                    type="datetime-local"
                    value={clipEndAt}
                    onChange={(event) => setClipEndAt(event.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between rounded-[18px] border border-white/8 bg-black/10 px-3 py-2">
                  <Label className="text-xs text-slate-400">Arrêter le flux après création</Label>
                  <Switch checked={clipEndStream} onCheckedChange={setClipEndStream} />
                </div>
                <Button
                  onClick={() => void onCreateReplayClip()}
                  disabled={clipSubmitting}
                  className="w-full"
                >
                  {clipSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MonitorPlay className="mr-2 size-4" />}
                  Créer replay depuis fenêtre
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void onProcessClipQueue()}
                  disabled={clipQueueRunning}
                  className="w-full"
                >
                  {clipQueueRunning ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                  Traiter la file clips
                </Button>
              </div>
            </div>
            <div className="console-panel p-4">
              <h3 className="text-sm font-semibold">Dernière validation HLS</h3>
              {validation ? (
                <div className="mt-3 space-y-2 text-sm text-slate-400">
                  <StatusBadge status={validation.summary === "OK" ? "HEALTHY" : validation.summary === "WARN" ? "DEGRADED" : "DOWN"} />
                  <p>{dateLabel(validation.validatedAt)}</p>
                  <p>Variants {validation.metrics.variantsCount} | Audio {validation.metrics.audioTracks} | Sous-titres {validation.metrics.subtitleTracks}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">Aucune validation exécutée.</p>
              )}
              <div className="mt-3 rounded-[20px] border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-400">
                <p>Erreurs player 1h: <span className="font-medium text-slate-100">{analytics?.summary.errors1h ?? 0}</span></p>
                <p>Bitrate réel 1 h: <span className="font-medium text-slate-100">{analytics?.summary.bitrateAvg1h ?? 0} kbps</span></p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="health" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Contrôles OK</p>
              <p className="mt-1 text-xl font-semibold text-emerald-300">{healthCounts.ok}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Contrôles WARN</p>
              <p className="mt-1 text-xl font-semibold text-amber-300">{healthCounts.warn}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Contrôles FAIL</p>
              <p className="mt-1 text-xl font-semibold text-rose-300">{healthCounts.fail}</p>
            </div>
          </div>

          <DataTableShell title="Contrôles automatiques" description="Manifest, variants, playlist et segments." loading={validating} isEmpty={!validation || validation.checks.length === 0} emptyTitle="Aucun contrôle" emptyDescription="Lancez une validation HLS.">
            <Table>
              <TableHeader><TableRow><TableHead>Contrôle</TableHead><TableHead>Statut</TableHead><TableHead>Détails</TableHead></TableRow></TableHeader>
              <TableBody>
                {(validation?.checks ?? []).map((check) => (
                  <TableRow key={check.key} >
                    <TableCell>{check.label}</TableCell>
                    <TableCell><StatusBadge status={check.status === "OK" ? "HEALTHY" : check.status === "WARN" ? "DEGRADED" : "DOWN"} /></TableCell>
                    <TableCell className="text-sm text-slate-400">{check.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
          <div className="console-panel p-4">
            <h3 className="text-sm font-semibold">Chronologie incidents</h3>
            {incidents.length === 0 ? <p className="mt-2 text-sm text-slate-400">Aucun incident détecté.</p> : <div className="mt-2 space-y-2">{incidents.map((line) => <p key={line} className="text-sm text-slate-400">{line}</p>)}</div>}
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="console-panel space-y-4 p-4 xl:col-span-2">
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    patchConfig(preset);
                    setFeedback(`Préréglage ${PRESET_LABELS[key] ?? key} appliqué.`);
                  }}
                  
                >
                  {PRESET_LABELS[key] ?? key}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Nom du flux</Label><Input value={config.title} onChange={(e) => patchConfig({ title: e.target.value })} className="mt-1" /></div>
              <div><Label>Manifest HLS</Label><Input value={config.hlsUrl} onChange={(e) => patchConfig({ hlsUrl: e.target.value })} className="mt-1" /></div>
              <div><Label>Fenêtre DVR (sec)</Label><Input type="number" value={config.dvrWindowSec} onChange={(e) => patchConfig({ dvrWindowSec: Number(e.target.value) || 0 })} className="mt-1" /></div>
              <div className="space-y-2 pt-6">
                <div className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2"><Label>DVR</Label><Switch checked={config.dvrEnabled} onCheckedChange={(checked) => patchConfig({ dvrEnabled: checked, dvrWindowSec: checked ? Math.max(config.dvrWindowSec, 3600) : 0 })} /></div>
                <div className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2"><Label>Faible latence</Label><Switch checked={config.latency !== "normal"} onCheckedChange={(checked) => patchConfig({ latency: checked ? "low" : "normal" })} /></div>
                <div className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2"><Label>Retour arrière</Label><Switch checked={config.timeshift} onCheckedChange={(checked) => patchConfig({ timeshift: checked })} /></div>
                <div className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2"><Label>DRM</Label><Switch checked={config.drmEnabled} onCheckedChange={(checked) => patchConfig({ drmEnabled: checked })} /></div>
              </div>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "none", label: "Aucun" },
                  { value: "widevine", label: "Widevine" },
                  { value: "fairplay", label: "FairPlay" },
                  { value: "multi", label: "Widevine + FairPlay" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!config.drmEnabled}
                    onClick={() => setDrmConfig((prev) => ({ ...prev, provider: option.value as DrmProvider }))}
                    className={drmConfig.provider === option.value ? "border-[#4c82fb]/40 bg-[#1c2a4a] text-[#4c82fb]" : "border-[#262b38] bg-[#151821] text-slate-100"}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div><Label>URL licence Widevine</Label><Input value={drmConfig.widevineLicenseUrl} disabled={!config.drmEnabled} onChange={(e) => setDrmConfig((prev) => ({ ...prev, widevineLicenseUrl: e.target.value }))} className="mt-1" /></div>
                <div><Label>URL licence FairPlay</Label><Input value={drmConfig.fairplayLicenseUrl} disabled={!config.drmEnabled} onChange={(e) => setDrmConfig((prev) => ({ ...prev, fairplayLicenseUrl: e.target.value }))} className="mt-1" /></div>
              </div>
              <div className="mt-3"><Label>URL certificat FairPlay</Label><Input value={drmConfig.fairplayCertificateUrl} disabled={!config.drmEnabled} onChange={(e) => setDrmConfig((prev) => ({ ...prev, fairplayCertificateUrl: e.target.value }))} className="mt-1" /></div>
              <p className="mt-2 text-xs text-slate-400">Les endpoints DRM restent stockés localement tant que le backend DRM dédié n’est pas activé.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Pays autorisés</Label><Input value={config.geoAllow} onChange={(e) => patchConfig({ geoAllow: e.target.value })} className="mt-1" /></div>
              <div><Label>Pays bloqués</Label><Input value={config.geoBlock} onChange={(e) => patchConfig({ geoBlock: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label>Mappage sous-titres (lang|url ou lang|label|url)</Label><Textarea value={config.captionsText} onChange={(e) => patchConfig({ captionsText: e.target.value })} className="mt-1 min-h-[120px]" /></div>
            <div className="flex justify-end"><Button onClick={onSaveConfig} disabled={saving} >{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}Enregistrer</Button></div>
          </div>
          <div className="console-panel space-y-4 p-4">
            <h3 className="text-sm font-semibold">Test de géoblocage</h3>
            <Input value={geoProbe} onChange={(e) => setGeoProbe(e.target.value)} placeholder="FR"  />
            {geoResult ? <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3"><StatusBadge status={geoResult.status} /><p className="mt-2 text-sm text-slate-400">{geoResult.text}</p></div> : null}
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-400">
              Checklist de mise en service : manifest accessible, DRM OK, géoblocage vérifié, EPG publié.
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-400">
              État d’édition : <span className="font-medium text-slate-100">{configDirty ? "Modifications non sauvegardées" : "À jour"}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <DataTableShell title="Série 24 h" description="Audience, bitrate et erreurs" loading={analyticsLoading} isEmpty={!analyticsLoading && series.length === 0} emptyTitle="Pas de métriques" emptyDescription="Aucune mesure sur 24 h.">
            <Table>
              <TableHeader><TableRow><TableHead>Horodatage</TableHead><TableHead>Audience</TableHead><TableHead>Bitrate</TableHead><TableHead>Erreurs</TableHead></TableRow></TableHeader>
              <TableBody>
                {series.map((row) => (
                  <TableRow key={row.ts} >
                    <TableCell className="text-sm text-slate-400">{dateLabel(row.ts)}</TableCell>
                    <TableCell>{row.viewers}</TableCell>
                    <TableCell>{row.bitrateKbps} kbps</TableCell>
                    <TableCell>{row.errors}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <DataTableShell title="Journal d’audit" description="Qui a changé quoi sur ce flux" isEmpty={audits.length === 0} emptyTitle="Aucun événement" emptyDescription="L’audit est alimenté à chaque action sensible.">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Acteur</TableHead><TableHead>Action</TableHead><TableHead>Détails</TableHead></TableRow></TableHeader>
              <TableBody>
                {audits.map((row) => (
                  <TableRow key={row.id} >
                    <TableCell className="text-sm text-slate-400">{dateLabel(row.at)}</TableCell>
                    <TableCell>{row.actor}</TableCell>
                    <TableCell><Badge >{row.action}</Badge></TableCell>
                    <TableCell className="text-sm text-slate-400">{row.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}



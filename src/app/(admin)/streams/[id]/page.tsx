"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Copy,
  Loader2,
  MonitorPlay,
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
};
type AnalyticsResult = {
  ok: true;
  current: { viewers: number; bitrateKbps: number; errors: number; updatedAt: string | null };
  summary: { viewersAvg1h: number; viewersPeak24h: number; bitrateAvg1h: number; errors1h: number; errors24h: number };
  series24h: Array<{ ts: string; viewers: number; bitrateKbps: number; errors: number }>;
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

const PRESETS: Record<string, Partial<StreamConfig>> = {
  standard: { latency: "normal", dvrEnabled: false, dvrWindowSec: 0, timeshift: true, drmEnabled: false },
  low: { latency: "low", dvrEnabled: false, dvrWindowSec: 0, timeshift: true, drmEnabled: false },
  dvr: { latency: "normal", dvrEnabled: true, dvrWindowSec: 21600, timeshift: true, drmEnabled: false },
  sport: { latency: "low", dvrEnabled: true, dvrWindowSec: 7200, timeshift: true, drmEnabled: true },
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
  const previousSummaryRef = useRef<ValidationResult["summary"] | null>(null);

  const addAudit = useCallback((action: string, details: string, actor = "operator") => {
    const at = new Date().toISOString();
    setAudit((prev) => [{ id: `${action}-${at}`, at, action, details, actor }, ...prev]);
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
      const response = await fetch(`/api/streams/${id}/audit?limit=40`, { cache: "no-store" });
      const json = (await response.json().catch(() => null)) as
        | { ok: true; logs: AuditApiRow[] }
        | { ok?: false; error?: string }
        | null;
      if (!response.ok || !json || !("ok" in json) || !json.ok) return;

      const mapped = (json.logs ?? []).map((row) => {
        const metadata = (row.metadata ?? {}) as Record<string, unknown>;
        const diff = metadata.diff as Record<string, { before: unknown; after: unknown }> | undefined;
        const incidents = Array.isArray(metadata.incidents)
          ? (metadata.incidents.filter((item) => typeof item === "string") as string[])
          : [];

        let details = "";
        if (diff && Object.keys(diff).length > 0) {
          details = Object.entries(diff)
            .slice(0, 4)
            .map(([field, delta]) => `${field}: ${String(delta.before)} -> ${String(delta.after)}`)
            .join(" | ");
        } else if (incidents.length > 0) {
          details = incidents.slice(0, 2).join(" | ");
        } else {
          details = `Action ${row.action.toLowerCase()} executee`;
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

      const incidentLines: string[] = [];
      for (const row of json.logs ?? []) {
        if (row.action !== "STREAM_VALIDATE_HLS") continue;
        const metadata = (row.metadata ?? {}) as Record<string, unknown>;
        const summary = typeof metadata.summary === "string" ? metadata.summary.toUpperCase() : "";
        if (!["WARN", "FAIL"].includes(summary)) continue;
        const incidents = Array.isArray(metadata.incidents)
          ? (metadata.incidents.filter((item) => typeof item === "string") as string[])
          : [];
        incidentLines.push(
          `${dateLabel(row.created_at)} - ${summary}${incidents.length > 0 ? ` - ${incidents[0]}` : ""}`
        );
      }
      setIncidents(incidentLines.slice(0, 20));
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
      if ((json.summary === "WARN" || json.summary === "FAIL") && (!previousSummaryRef.current || previousSummaryRef.current === "OK")) {
        setIncidents((prev) => [`${dateLabel(json.validatedAt)} - incident detecte`, ...prev]);
      }
      if (json.summary === "OK" && previousSummaryRef.current && previousSummaryRef.current !== "OK") {
        setIncidents((prev) => [`${dateLabel(json.validatedAt)} - incident resolu`, ...prev]);
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
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadAnalytics, loadAudit, loadStream]);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) void loadAnalytics(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadAnalytics(true);
    }, 15000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [loadAnalytics]);

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
            const [lang, url] = line.split("|");
            return { lang: (lang || "und").trim(), url: (url || "").trim(), kind: "subtitles" as const };
          })
          .filter((item) => item.url.length > 0),
      });
      setStream(next);
      setConfig(buildConfig(next));
      setFeedback("Configuration enregistree.");
      addAudit("UPDATE_CONFIG", "Configuration stream mise a jour");
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
    if (!confirm("Confirmer l'arret du flux ?")) return;
    const next = await setStreamStatus(stream.id, "OFFLINE");
    setStream(next);
    addAudit("STOP_STREAM", "Flux passe en OFFLINE");
    void loadAudit();
  };

  const onCreateReplay = async () => {
    if (!stream) return;
    await endLiveAndCreateReplay(stream.id, { title: stream.title });
    setFeedback("Replay cree.");
    addAudit("CREATE_REPLAY", "Replay cree depuis live");
    void loadAudit();
  };

  const geoResult = useMemo(() => {
    if (!config || !geoProbe.trim()) return null;
    const country = geoProbe.trim().toUpperCase();
    const allow = parseList(config.geoAllow);
    const block = parseList(config.geoBlock);
    if (block.includes(country)) return { status: "DOWN", text: `${country} bloque` };
    if (allow.length > 0 && !allow.includes(country)) return { status: "WARN", text: `${country} hors allowlist` };
    return { status: "HEALTHY", text: `${country} autorise` };
  }, [config, geoProbe]);

  const series = useMemo(() => (analytics?.series24h ?? []).slice(-20).reverse(), [analytics?.series24h]);
  const audits = useMemo(() => [...audit].sort((a, b) => (a.at > b.at ? -1 : 1)), [audit]);

  if (loading || !stream || !config) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-[#8b93a7]">
        <Loader2 className="size-5 animate-spin" />
        Chargement...
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={stream.title}
        subtitle="Controle premium du flux HLS: etat, validation, configuration, analytics et audit."
        breadcrumbs={[{ label: "Console Editeur", href: "/dashboard" }, { label: "Direct", href: "/streams" }, { label: "Stream details" }]}
        actions={
          <>
            <StatusBadge status={stream.status} />
            <Button variant="outline" onClick={() => { void loadStream(); void loadAnalytics(true); }} className="border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]">
              <RefreshCw className="mr-2 size-4" />
              Actualiser
            </Button>
          </>
        }
      />

      {feedback ? <div className="rounded-xl border border-[#262b38] bg-[#1b1f2a] px-4 py-3 text-sm">{feedback}</div> : null}

      <KpiRow>
        <KpiCard label="Viewers now" value={analytics?.current.viewers ?? 0} tone="info" loading={analyticsLoading} />
        <KpiCard label="Peak 24h" value={analytics?.summary.viewersPeak24h ?? 0} loading={analyticsLoading} />
        <KpiCard label="Bitrate 1h" value={`${analytics?.summary.bitrateAvg1h ?? 0} kbps`} loading={analyticsLoading} />
        <KpiCard label="Erreurs 24h" value={analytics?.summary.errors24h ?? 0} tone={(analytics?.summary.errors24h ?? 0) > 0 ? "warning" : "success"} loading={analyticsLoading} />
      </KpiRow>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="border border-[#262b38] bg-[#1b1f2a]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity / Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <div className="overflow-hidden rounded-xl border border-[#262b38] bg-[#151821]">
              <div className="aspect-video bg-black">
                <HlsPlayer streamId={stream.id} src={stream.hlsUrl} muted={muted} autoPlay controls className="h-full w-full" onErrorChange={setPlayerError} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#262b38] px-4 py-3">
                <span className="text-xs text-[#8b93a7]">Derniere activite: {dateLabel(stream.updatedAt)}</span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setMuted((v) => !v)} className="border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]">
                    {muted ? <VolumeX className="mr-2 size-4" /> : <Volume2 className="mr-2 size-4" />}
                    {muted ? "Unmute" : "Mute"}
                  </Button>
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(stream.hlsUrl).catch(() => {})} className="border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]">
                    <Copy className="mr-2 size-4" />
                    Copier URL manifest
                  </Button>
                  <Button onClick={() => void runValidation()} className="bg-[#4c82fb] text-white hover:bg-[#3b6fe0]">
                    {validating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldAlert className="mr-2 size-4" />}
                    Valider HLS
                  </Button>
                </div>
              </div>
            </div>
            {playerError ? <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">{playerError}</div> : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-[#262b38] bg-[#151821] p-4">
              <h3 className="text-sm font-semibold">Actions operateur</h3>
              <div className="mt-3 space-y-2">
                <Button onClick={onSetLive} disabled={stream.status === "LIVE"} className="w-full justify-start bg-[#22c55e] text-black hover:bg-[#22c55e]/90"><Play className="mr-2 size-4" />Passer live</Button>
                <Button onClick={onStop} disabled={stream.status !== "LIVE"} variant="outline" className="w-full justify-start border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b]"><Square className="mr-2 size-4" />Arreter le flux</Button>
                <Button onClick={onCreateReplay} variant="outline" className="w-full justify-start border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]"><MonitorPlay className="mr-2 size-4" />Creer replay</Button>
              </div>
            </div>
            <div className="rounded-xl border border-[#262b38] bg-[#151821] p-4">
              <h3 className="text-sm font-semibold">Derniere validation</h3>
              {validation ? (
                <div className="mt-3 space-y-2 text-sm text-[#8b93a7]">
                  <StatusBadge status={validation.summary === "OK" ? "HEALTHY" : validation.summary === "WARN" ? "DEGRADED" : "DOWN"} />
                  <p>{dateLabel(validation.validatedAt)}</p>
                  <p>Variants {validation.metrics.variantsCount} | Audio {validation.metrics.audioTracks} | Subtitles {validation.metrics.subtitleTracks}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#8b93a7]">Aucune validation executee.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="health" className="mt-4 space-y-4">
          <DataTableShell title="Checks automatiques" description="Manifest, variants, playlist, segments." loading={validating} isEmpty={!validation || validation.checks.length === 0} emptyTitle="Aucun check" emptyDescription="Lancez Valider HLS.">
            <Table>
              <TableHeader className="bg-[#1b1f2a]"><TableRow className="border-[#262b38]"><TableHead>Check</TableHead><TableHead>Statut</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
              <TableBody>
                {(validation?.checks ?? []).map((check) => (
                  <TableRow key={check.key} className="border-[#262b38] hover:bg-white/[0.03]">
                    <TableCell>{check.label}</TableCell>
                    <TableCell><StatusBadge status={check.status === "OK" ? "HEALTHY" : check.status === "WARN" ? "DEGRADED" : "DOWN"} /></TableCell>
                    <TableCell className="text-sm text-[#8b93a7]">{check.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
          <div className="rounded-xl border border-[#262b38] bg-[#151821] p-4">
            <h3 className="text-sm font-semibold">Timeline incidents</h3>
            {incidents.length === 0 ? <p className="mt-2 text-sm text-[#8b93a7]">Aucun incident detecte.</p> : <div className="mt-2 space-y-2">{incidents.map((line) => <p key={line} className="text-sm text-[#8b93a7]">{line}</p>)}</div>}
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 rounded-xl border border-[#262b38] bg-[#151821] p-4 xl:col-span-2">
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <Button key={key} type="button" variant="outline" size="sm" onClick={() => setConfig((prev) => (prev ? { ...prev, ...preset } : prev))} className="border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]">{key}</Button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Nom du flux</Label><Input value={config.title} onChange={(e) => setConfig((prev) => (prev ? { ...prev, title: e.target.value } : prev))} className="mt-1 border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]" /></div>
              <div><Label>Manifest HLS</Label><Input value={config.hlsUrl} onChange={(e) => setConfig((prev) => (prev ? { ...prev, hlsUrl: e.target.value } : prev))} className="mt-1 border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]" /></div>
              <div><Label>DVR window (sec)</Label><Input type="number" value={config.dvrWindowSec} onChange={(e) => setConfig((prev) => (prev ? { ...prev, dvrWindowSec: Number(e.target.value) || 0 } : prev))} className="mt-1 border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]" /></div>
              <div className="space-y-2 pt-6">
                <div className="flex items-center justify-between rounded-lg border border-[#262b38] bg-[#1b1f2a] px-3 py-2"><Label>DVR</Label><Switch checked={config.dvrEnabled} onCheckedChange={(checked) => setConfig((prev) => (prev ? { ...prev, dvrEnabled: checked, dvrWindowSec: checked ? Math.max(prev.dvrWindowSec, 3600) : 0 } : prev))} /></div>
                <div className="flex items-center justify-between rounded-lg border border-[#262b38] bg-[#1b1f2a] px-3 py-2"><Label>Timeshift</Label><Switch checked={config.timeshift} onCheckedChange={(checked) => setConfig((prev) => (prev ? { ...prev, timeshift: checked } : prev))} /></div>
                <div className="flex items-center justify-between rounded-lg border border-[#262b38] bg-[#1b1f2a] px-3 py-2"><Label>DRM</Label><Switch checked={config.drmEnabled} onCheckedChange={(checked) => setConfig((prev) => (prev ? { ...prev, drmEnabled: checked } : prev))} /></div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Geo allow</Label><Input value={config.geoAllow} onChange={(e) => setConfig((prev) => (prev ? { ...prev, geoAllow: e.target.value } : prev))} className="mt-1 border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]" /></div>
              <div><Label>Geo block</Label><Input value={config.geoBlock} onChange={(e) => setConfig((prev) => (prev ? { ...prev, geoBlock: e.target.value } : prev))} className="mt-1 border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]" /></div>
            </div>
            <div><Label>Subtitles mapping (lang|url)</Label><Textarea value={config.captionsText} onChange={(e) => setConfig((prev) => (prev ? { ...prev, captionsText: e.target.value } : prev))} className="mt-1 min-h-[120px] border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]" /></div>
            <div className="flex justify-end"><Button onClick={onSaveConfig} disabled={saving} className="bg-[#4c82fb] text-white hover:bg-[#3b6fe0]">{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}Enregistrer</Button></div>
          </div>
          <div className="space-y-4 rounded-xl border border-[#262b38] bg-[#151821] p-4">
            <h3 className="text-sm font-semibold">Test geoblocking</h3>
            <Input value={geoProbe} onChange={(e) => setGeoProbe(e.target.value)} placeholder="FR" className="border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]" />
            {geoResult ? <div className="rounded-lg border border-[#262b38] bg-[#1b1f2a] p-3"><StatusBadge status={geoResult.status} /><p className="mt-2 text-sm text-[#8b93a7]">{geoResult.text}</p></div> : null}
            <div className="rounded-lg border border-[#262b38] bg-[#1b1f2a] p-3 text-sm text-[#8b93a7]">
              Checklist go live: manifest accessible, DRM OK, geoblocking verifie, EPG publie.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <DataTableShell title="Serie 24h" description="Viewers / bitrate / erreurs" loading={analyticsLoading} isEmpty={!analyticsLoading && series.length === 0} emptyTitle="Pas de metriques" emptyDescription="Aucune mesure sur 24h.">
            <Table>
              <TableHeader className="bg-[#1b1f2a]"><TableRow className="border-[#262b38]"><TableHead>Timestamp</TableHead><TableHead>Viewers</TableHead><TableHead>Bitrate</TableHead><TableHead>Erreurs</TableHead></TableRow></TableHeader>
              <TableBody>
                {series.map((row) => (
                  <TableRow key={row.ts} className="border-[#262b38] hover:bg-white/[0.03]">
                    <TableCell className="text-sm text-[#8b93a7]">{dateLabel(row.ts)}</TableCell>
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
          <DataTableShell title="Audit trail" description="Qui a change quoi sur ce flux" isEmpty={audits.length === 0} emptyTitle="Aucun evenement" emptyDescription="L'audit est alimente a chaque action sensible.">
            <Table>
              <TableHeader className="bg-[#1b1f2a]"><TableRow className="border-[#262b38]"><TableHead>Date</TableHead><TableHead>Acteur</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
              <TableBody>
                {audits.map((row) => (
                  <TableRow key={row.id} className="border-[#262b38] hover:bg-white/[0.03]">
                    <TableCell className="text-sm text-[#8b93a7]">{dateLabel(row.at)}</TableCell>
                    <TableCell>{row.actor}</TableCell>
                    <TableCell><Badge className="border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]">{row.action}</Badge></TableCell>
                    <TableCell className="text-sm text-[#8b93a7]">{row.details}</TableCell>
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

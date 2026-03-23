"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Unplug,
  Waypoints,
} from "lucide-react";

import { DataTableShell } from "@/components/console/data-table-shell";
import { FilterBar } from "@/components/console/filter-bar";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type BackfillTenant = {
  id: string;
  name: string;
};

type BackfillChannel = {
  id: string;
  name: string;
  slug: string;
  tenant_id: string | null;
  tenant_name: string | null;
  origin_hls_url: string | null;
  is_active: boolean;
  updated_at: string | null;
  issues: {
    missingTenant: boolean;
    missingOrigin: boolean;
  };
};

type BackfillResponse = {
  ok: true;
  tenants: BackfillTenant[];
  channels: BackfillChannel[];
  stats: {
    total: number;
    incomplete: number;
    missingTenant: number;
    missingOrigin: number;
  };
};

type SaveResponse =
  | { ok: true; channel: BackfillChannel }
  | { ok?: false; error?: string };

type AutofillResponse =
  | {
      ok: true;
      updated: number;
      updated_origin: number;
      updated_tenant: number;
      skipped_count: number;
    }
  | { ok?: false; error?: string };

type FilterMode = "all" | "incomplete" | "missingTenant" | "missingOrigin";

type DraftState = {
  tenantId: string | null;
  originHlsUrl: string;
};

const FILTER_OPTIONS: Array<{ value: FilterMode; label: string }> = [
  { value: "incomplete", label: "Incomplètes" },
  { value: "missingTenant", label: "Sans éditeur" },
  { value: "missingOrigin", label: "Sans origine" },
  { value: "all", label: "Toutes" },
];

function dateTimeFormat(value: string | null) {
  if (!value) return "--";

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "--";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function numberFormat(value: number) {
  try {
    return new Intl.NumberFormat("fr-FR").format(value);
  } catch {
    return String(value);
  }
}

function buildDraft(channel: BackfillChannel): DraftState {
  return {
    tenantId: channel.tenant_id,
    originHlsUrl: channel.origin_hls_url ?? "",
  };
}

function IssueBadge({
  active,
  okLabel,
  issueLabel,
}: {
  active: boolean;
  okLabel: string;
  issueLabel: string;
}) {
  return active ? (
    <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-200">
      <AlertTriangle className="size-3.5" />
      {issueLabel}
    </Badge>
  ) : (
    <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200">
      <CheckCircle2 className="size-3.5" />
      {okLabel}
    </Badge>
  );
}

export default function ChannelBackfillPage() {
  const [data, setData] = useState<BackfillResponse | null>(null);
  const [filter, setFilter] = useState<FilterMode>("incomplete");
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const syncDrafts = useCallback((channels: BackfillChannel[]) => {
    setDrafts(Object.fromEntries(channels.map((channel) => [channel.id, buildDraft(channel)])));
  }, []);

  const load = useCallback(
    async (soft = false) => {
      if (soft) setRefreshing(true);
      else setLoading(true);

      setError("");
      try {
        const res = await fetch("/api/superadmin/channel-backfill", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as BackfillResponse | { ok?: false; error?: string } | null;
        if (!res.ok || !json || !("ok" in json) || !json.ok) {
          setError((json && "error" in json && json.error) || "Impossible de charger la remédiation des chaînes.");
          return;
        }

        setData(json);
        syncDrafts(json.channels);
      } catch {
        setError("Erreur réseau sur la remédiation des chaînes.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [syncDrafts]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const filteredChannels = useMemo(() => {
    const rows = data?.channels ?? [];
    return rows.filter((channel) => {
      if (filter === "all") return true;
      if (filter === "incomplete") return channel.issues.missingOrigin || channel.issues.missingTenant;
      if (filter === "missingOrigin") return channel.issues.missingOrigin;
      if (filter === "missingTenant") return channel.issues.missingTenant;
      return true;
    });
  }, [data, filter]);

  const onSave = async (channel: BackfillChannel) => {
    const draft = drafts[channel.id];
    if (!draft) return;

    setSavingId(channel.id);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/superadmin/channel-backfill", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: channel.id,
          tenantId: draft.tenantId,
          originHlsUrl: draft.originHlsUrl.trim() || null,
        }),
      });

      const json = (await res.json().catch(() => null)) as SaveResponse | null;
      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        setError((json && "error" in json && json.error) || "Impossible de sauvegarder la chaîne.");
        return;
      }

      setData((current) => {
        if (!current) return current;

        const channels = current.channels.map((item) => (item.id === json.channel.id ? json.channel : item));
        const stats = channels.reduce(
          (acc, item) => {
            acc.total += 1;
            if (item.issues.missingTenant) acc.missingTenant += 1;
            if (item.issues.missingOrigin) acc.missingOrigin += 1;
            if (item.issues.missingTenant || item.issues.missingOrigin) acc.incomplete += 1;
            return acc;
          },
          { total: 0, incomplete: 0, missingTenant: 0, missingOrigin: 0 }
        );

        return { ...current, channels, stats };
      });

      setNotice("Les changements ont été sauvegardés.");
    } catch {
      setError("Erreur réseau pendant la sauvegarde.");
    } finally {
      setSavingId(null);
    }
  };

  const onAutofill = async () => {
    setAutofilling(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/superadmin/channel-backfill", { method: "POST" });
      const json = (await res.json().catch(() => null)) as AutofillResponse | null;
      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        setError((json && "error" in json && json.error) || "Impossible d’exécuter le préremplissage.");
        return;
      }

      setNotice(
        `${json.updated} chaîne(s) mises à jour automatiquement (${json.updated_origin} origine(s), ${json.updated_tenant} rattachement(s) éditeur).`
      );
      await load(true);
    } catch {
      setError("Erreur réseau pendant le préremplissage.");
    } finally {
      setAutofilling(false);
    }
  };

  const resetFilter = () => setFilter("incomplete");
  const tableError = !data ? error : null;

  return (
    <PageShell>
      <PageHeader
        title="Remédiation des chaînes"
        subtitle="Rattachez les chaînes orphelines et injectez les origines HLS manquantes avant exposition OTT."
        breadcrumbs={[
          { label: "Oniix Console", href: "/dashboard" },
          { label: "Système", href: "/system" },
          { label: "Remédiation des chaînes" },
        ]}
        icon={<ShieldCheck className="size-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => void load(true)}>
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button variant="outline" onClick={() => void onAutofill()} disabled={autofilling}>
              {autofilling ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Préremplir
            </Button>
            <Button asChild>
              <Link href="/channels">
                Ouvrir les chaînes
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </>
        }
      />

      {error && data ? (
        <section className="console-panel flex items-start gap-3 border-rose-500/20 bg-rose-500/10 px-5 py-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[18px] border border-rose-500/20 bg-rose-500/14 text-rose-100">
            <AlertTriangle className="size-4" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-rose-100">Opération en échec</p>
            <p className="text-sm text-rose-100/75">{error}</p>
          </div>
        </section>
      ) : null}

      {notice ? (
        <section className="console-panel flex items-start gap-3 border-emerald-400/18 bg-emerald-500/10 px-5 py-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[18px] border border-emerald-400/20 bg-emerald-500/14 text-emerald-100">
            <CheckCircle2 className="size-4" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-emerald-50">Opération terminée</p>
            <p className="text-sm text-emerald-100/75">{notice}</p>
          </div>
        </section>
      ) : null}

      <KpiRow>
        <KpiCard
          label="Chaînes totales"
          value={numberFormat(data?.stats.total ?? 0)}
          hint="Base complète détectée dans le parc."
          icon={<Waypoints className="size-4" />}
          loading={loading && !data}
        />
        <KpiCard
          label="Chaînes incomplètes"
          value={numberFormat(data?.stats.incomplete ?? 0)}
          hint="Au moins un prérequis manque pour l’exposition OTT."
          tone="warning"
          icon={<AlertTriangle className="size-4" />}
          loading={loading && !data}
        />
        <KpiCard
          label="Sans éditeur"
          value={numberFormat(data?.stats.missingTenant ?? 0)}
          hint="Chaînes non rattachées à un tenant."
          tone="error"
          icon={<ShieldCheck className="size-4" />}
          loading={loading && !data}
        />
        <KpiCard
          label="Sans origine"
          value={numberFormat(data?.stats.missingOrigin ?? 0)}
          hint="Origines HLS encore absentes."
          tone="info"
          icon={<Unplug className="size-4" />}
          loading={loading && !data}
        />
      </KpiRow>

      <DataTableShell
        title="Corrections globales"
        description={`${numberFormat(filteredChannels.length)} chaîne(s) visibles sur ${numberFormat(data?.stats.total ?? 0)}.`}
        loading={loading && !data}
        error={tableError}
        onRetry={() => void load(false)}
        isEmpty={!loading && !tableError && filteredChannels.length === 0}
        emptyTitle="Aucune chaîne à traiter"
        emptyDescription="Le filtre actif ne remonte plus de chaîne à corriger."
      >
        <FilterBar onReset={resetFilter} resetDisabled={filter === "incomplete"}>
          <div className="inline-flex flex-wrap items-center gap-2">
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={filter === option.value ? "secondary" : "outline"}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </FilterBar>

        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[rgba(10,16,24,0.96)] backdrop-blur">
            <TableRow className="hover:bg-transparent">
              <TableHead>Chaîne</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Origine HLS</TableHead>
              <TableHead>Etat</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredChannels.map((channel) => {
              const draft = drafts[channel.id] ?? buildDraft(channel);
              const dirty =
                draft.tenantId !== channel.tenant_id ||
                draft.originHlsUrl.trim() !== (channel.origin_hls_url ?? "");

              return (
                <TableRow key={channel.id}>
                  <TableCell className="align-top">
                    <div className="space-y-1.5">
                      <p className="font-medium text-white">{channel.name}</p>
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                        /{channel.slug || channel.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-slate-500">Maj {dateTimeFormat(channel.updated_at)}</p>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="space-y-2">
                      <Select
                        value={draft.tenantId ?? "__none__"}
                        onValueChange={(value) =>
                          setDrafts((current) => ({
                            ...current,
                            [channel.id]: {
                              ...draft,
                              tenantId: value === "__none__" ? null : value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Choisir un éditeur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Aucun éditeur</SelectItem>
                          {(data?.tenants ?? []).map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">Actuel : {channel.tenant_name ?? "Non affecté"}</p>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="space-y-2">
                      <Input
                        value={draft.originHlsUrl}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [channel.id]: {
                              ...draft,
                              originHlsUrl: event.target.value,
                            },
                          }))
                        }
                        placeholder="https://origin.example/live/master.m3u8"
                        className="min-w-[340px] font-mono text-xs"
                      />
                      <p className="text-xs text-slate-500">
                        {channel.origin_hls_url ? "Origine configurée." : "Origine manquante."}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="flex flex-col items-start gap-2">
                      <IssueBadge
                        active={channel.issues.missingTenant}
                        okLabel="Éditeur OK"
                        issueLabel="Sans éditeur"
                      />
                      <IssueBadge
                        active={channel.issues.missingOrigin}
                        okLabel="Origine OK"
                        issueLabel="Origine manquante"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="text-right align-top">
                    <Button onClick={() => void onSave(channel)} disabled={!dirty || savingId === channel.id}>
                      {savingId === channel.id ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Sauvegarder
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>
    </PageShell>
  );
}

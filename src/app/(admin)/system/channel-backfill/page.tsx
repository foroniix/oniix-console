"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Loader2, RefreshCw, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function dateTimeFormat(value: string | null) {
  if (!value) return "--";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "--";
  return new Date(parsed).toLocaleString("fr-FR");
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
    setDrafts(
      Object.fromEntries(channels.map((channel) => [channel.id, buildDraft(channel)]))
    );
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
          setError((json && "error" in json && json.error) || "Impossible de charger le backfill des chaînes.");
          return;
        }

        setData(json);
        syncDrafts(json.channels);
      } catch {
        setError("Erreur réseau sur le backfill des chaînes.");
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
        setError((json && "error" in json && json.error) || "Impossible d'exécuter l'autofill.");
        return;
      }

      setNotice(
        `${json.updated} chaîne(s) mises à jour automatiquement (${json.updated_origin} origine(s), ${json.updated_tenant} tenant(s)).`
      );
      await load(true);
    } catch {
      setError("Erreur réseau pendant l'autofill.");
    } finally {
      setAutofilling(false);
    }
  };

  return (
    <div className="console-page">
      <header className="console-hero flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">Backfill des chaînes</h1>
            <Badge className="border border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
              Préparation OTT
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Affectez les chaînes orphelines à un tenant puis renseignez leur `origin_hls_url` pour activer le proxy Oniix.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void load(true)} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]">
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button variant="outline" onClick={onAutofill} disabled={autofilling} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]">
            {autofilling ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 size-4" />
            )}
            Auto-remplir depuis streams
          </Button>
          <Button asChild>
            <Link href="/channels">
              Vue chaînes
              <ArrowUpRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {error ? (
        <Card className="border-rose-300/70 bg-rose-50 dark:border-rose-400/20 dark:bg-rose-500/10">
          <CardContent className="p-4 text-sm text-rose-700 dark:text-rose-300">{error}</CardContent>
        </Card>
      ) : null}

      {notice ? (
        <Card className="border-emerald-300/70 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-300">{notice}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chaînes totales</CardDescription>
            <CardTitle>{numberFormat(data?.stats.total ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chaînes incomplètes</CardDescription>
            <CardTitle>{numberFormat(data?.stats.incomplete ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tenant manquant</CardDescription>
            <CardTitle>{numberFormat(data?.stats.missingTenant ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Origine manquante</CardDescription>
            <CardTitle>{numberFormat(data?.stats.missingOrigin ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Corrections globales</CardTitle>
            <CardDescription>
              Cette vue superadmin cible les chaînes invisibles dans les consoles tenant car elles ne sont pas encore correctement rattachées.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant={filter === "incomplete" ? "default" : "outline"} onClick={() => setFilter("incomplete")}>
              Incomplètes
            </Button>
            <Button variant={filter === "missingTenant" ? "default" : "outline"} onClick={() => setFilter("missingTenant")}>
              Sans tenant
            </Button>
            <Button variant={filter === "missingOrigin" ? "default" : "outline"} onClick={() => setFilter("missingOrigin")}>
              Sans origine
            </Button>
            <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
              Toutes
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-slate-500 dark:text-slate-400">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Chargement des chaînes...
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
              Aucune chaîne ne correspond au filtre.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chaîne</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Origine HLS</TableHead>
                  <TableHead>État</TableHead>
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
                        <div className="space-y-1">
                          <p className="font-medium text-white">{channel.name}</p>
                          <p className="font-mono text-xs text-zinc-500">/{channel.slug || channel.id.slice(0, 8)}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Maj : {dateTimeFormat(channel.updated_at)}</p>
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
                              <SelectValue placeholder="Choisir un tenant" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Aucun tenant</SelectItem>
                              {(data?.tenants ?? []).map((tenant) => (
                                <SelectItem key={tenant.id} value={tenant.id}>
                                  {tenant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Actuel : {channel.tenant_name ?? "Non affecté"}</p>
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
                            className="min-w-[320px] font-mono text-xs"
                          />
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {channel.origin_hls_url ? "Origine configurée." : "Origine manquante."}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="flex flex-col gap-2">
                          {channel.issues.missingTenant ? (
                            <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-300">
                              <AlertTriangle className="mr-1 size-3.5" />
                              Sans tenant
                            </Badge>
                          ) : (
                            <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                              <CheckCircle2 className="mr-1 size-3.5" />
                              Tenant OK
                            </Badge>
                          )}

                          {channel.issues.missingOrigin ? (
                            <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-300">
                              <AlertTriangle className="mr-1 size-3.5" />
                              Origine manquante
                            </Badge>
                          ) : (
                            <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                              <CheckCircle2 className="mr-1 size-3.5" />
                              Origine OK
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right align-top">
                        <Button onClick={() => void onSave(channel)} disabled={!dirty || savingId === channel.id}>
                          {savingId === channel.id ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 size-4" />
                          )}
                          Sauvegarder
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RadioTower,
  RefreshCw,
  Shield,
  Smartphone,
  Power,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SponsorshipOperator = {
  id: string;
  code: string;
  name: string;
  home_country_iso2?: string | null;
  integration_mode?: string | null;
  active?: boolean | null;
};

type SponsorshipOffer = {
  id: string;
  code: string;
  name: string;
  sponsorship_enabled?: boolean | null;
  active?: boolean | null;
};

type SponsorshipChannel = {
  id: string;
  name: string;
  active: boolean;
};

type SponsorshipStream = {
  id: string;
  title: string;
  channel_id?: string | null;
  status?: string | null;
};

type SponsorshipPolicy = {
  id: string;
  channel_id?: string | null;
  channel_name?: string | null;
  stream_id?: string | null;
  stream_title?: string | null;
  active: boolean;
  pilot_scoped: boolean;
  decision_mode: string;
  allowed_country_iso2?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  updated_at?: string | null;
};

type SponsorshipPayload = {
  domain_available: boolean;
  requires_migration: boolean;
  can_manage: boolean;
  recommended_operator_code: string;
  mobile_env_hint: string;
  operator: SponsorshipOperator | null;
  offer: SponsorshipOffer | null;
  available_channels: SponsorshipChannel[];
  available_streams: SponsorshipStream[];
  policies: SponsorshipPolicy[];
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

export function SponsorshipPilotCard() {
  const [data, setData] = useState<SponsorshipPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [channelId, setChannelId] = useState("");
  const [streamId, setStreamId] = useState("__all__");
  const [decisionMode, setDecisionMode] = useState<"sponsored" | "partner_bypass">("sponsored");
  const [countryIso2, setCountryIso2] = useState("BJ");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings/sponsorship", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; sponsorship?: SponsorshipPayload }
        | null;

      if (!res.ok || !json?.ok || !json.sponsorship) {
        throw new Error(json?.error || "Impossible de charger la configuration opérateur.");
      }

      const sponsorship = json.sponsorship;
      setData(sponsorship);
      setChannelId((current) => current || sponsorship.available_channels[0]?.id || "");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Impossible de charger la configuration opérateur."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredStreams = useMemo(() => {
    if (!data) return [];
    return data.available_streams.filter((stream) => !channelId || stream.channel_id === channelId);
  }, [channelId, data]);

  const activePoliciesCount = useMemo(
    () => data?.policies.filter((policy) => policy.active).length ?? 0,
    [data]
  );

  const totalScopedStreams = useMemo(
    () => data?.policies.filter((policy) => policy.active && policy.stream_id).length ?? 0,
    [data]
  );

  const createOrUpdatePolicy = async () => {
    if (!data?.can_manage) return;
    if (!channelId) {
      setError("Sélectionnez une chaîne avant d’activer le pilote.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/settings/sponsorship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: channelId,
          stream_id: streamId === "__all__" ? null : streamId,
          decision_mode: decisionMode,
          allowed_country_iso2: countryIso2.trim().toUpperCase() || "BJ",
        }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Impossible d’enregistrer la policy.");
      }

      setMessage("Policy Celtiis mise à jour.");
      await load();
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Impossible d’enregistrer la policy."));
    } finally {
      setSubmitting(false);
    }
  };

  const togglePolicy = async (policy: SponsorshipPolicy) => {
    setTogglingId(policy.id);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/settings/sponsorship", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: policy.id, active: !policy.active }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Impossible de mettre à jour la policy.");
      }

      setMessage(policy.active ? "Policy désactivée." : "Policy réactivée.");
      await load();
    } catch (toggleError) {
      setError(getErrorMessage(toggleError, "Impossible de mettre à jour la policy."));
    } finally {
      setTogglingId("");
    }
  };

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-4" />
          Pilote Celtiis Bénin
        </CardTitle>
        <CardDescription>
          Paramétrage du pilote sponsoring data Celtiis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {(error || message) && (
          <section
            className={cn(
              "flex items-start gap-3 rounded-[22px] border px-4 py-4",
              error ? "border-rose-500/20 bg-rose-500/10" : "border-emerald-400/18 bg-emerald-500/10"
            )}
          >
            <span
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-[18px] border",
                error
                  ? "border-rose-500/20 bg-rose-500/14 text-rose-100"
                  : "border-emerald-400/20 bg-emerald-500/14 text-emerald-100"
              )}
            >
              {error ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
            </span>
            <div className="space-y-1">
              <p className={cn("text-sm font-semibold", error ? "text-rose-100" : "text-emerald-50")}>
                {error ? "Configuration interrompue" : "Configuration mise à jour"}
              </p>
              <p className={cn("text-sm", error ? "text-rose-100/75" : "text-emerald-100/75")}>
                {error || message}
              </p>
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" />
            Chargement du domaine Celtiis...
          </div>
        ) : !data ? (
          <div className="rounded-[22px] border border-rose-500/18 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
            Impossible de charger la configuration sponsorship.
          </div>
        ) : !data.domain_available || data.requires_migration ? (
          <div className="rounded-[22px] border border-amber-400/18 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            Migration opérateur manquante. Appliquez
            {" "}
            <code>supabase/migrations/20260322141500_operator_sponsorship_foundation.sql</code>
            {" "}
            avant d’activer le pilote Celtiis.
          </div>
        ) : !data.operator || !data.offer ? (
          <div className="rounded-[22px] border border-amber-400/18 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            Le domaine sponsorship est disponible, mais l’opérateur Celtiis ou son offre pilote ne
            sont pas encore chargés en base.
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-4">
              <MetricCard
                label="Opérateur"
                value={data.operator.name}
                hint={`Mode ${data.operator.integration_mode ?? "manual_whitelist"}`}
              />
              <MetricCard
                label="Policies actives"
                value={String(activePoliciesCount)}
                hint="Ventilation pilote actuellement appliquée."
              />
              <MetricCard
                label="Directs ciblés"
                value={String(totalScopedStreams)}
                hint="Policies limitées à un direct unique."
              />
              <MetricCard
                label="Code mobile"
                value={data.recommended_operator_code}
                hint="Valeur attendue sur les builds pilote."
              />
            </div>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-4 flex items-center gap-2">
                  <RadioTower className="size-4 text-[var(--brand-primary)]" />
                  <div>
                    <p className="text-sm font-semibold text-white">Activer une policy pilote</p>
                    <p className="text-sm text-slate-400">
                      Ciblez une chaîne complète ou un direct du tenant actif.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Chaîne cible
                    </label>
                    <Select
                      value={channelId || undefined}
                      onValueChange={(value) => {
                        setChannelId(value);
                        setStreamId("__all__");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez une chaîne" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.available_channels.map((channel) => (
                          <SelectItem key={channel.id} value={channel.id}>
                            {channel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Direct ciblé
                    </label>
                    <Select value={streamId} onValueChange={setStreamId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Toute la chaîne" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Toute la chaîne</SelectItem>
                        {filteredStreams.map((stream) => (
                          <SelectItem key={stream.id} value={stream.id}>
                            {stream.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Décision
                    </label>
                    <Select
                      value={decisionMode}
                      onValueChange={(value) =>
                        setDecisionMode(value === "partner_bypass" ? "partner_bypass" : "sponsored")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez une décision" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sponsored">Sponsoring data</SelectItem>
                        <SelectItem value="partner_bypass">Partner bypass</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Pays autorisé
                    </label>
                    <Input
                      value={countryIso2}
                      maxLength={2}
                      onChange={(event) => setCountryIso2(event.target.value.toUpperCase())}
                      placeholder="BJ"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button type="button" onClick={createOrUpdatePolicy} disabled={submitting || !data.can_manage}>
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Activer sur le tenant
                  </Button>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-[var(--brand-primary)]" />
                    <div>
                      <p className="text-sm font-semibold text-white">Cadre pilote</p>
                      <p className="text-sm text-slate-400">
                        Points de contrôle avant activation.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="rounded-[20px] border border-white/8 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Offre pilote</p>
                      <p className="mt-1 font-medium text-white">{data.offer.name}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Build mobile</p>
                      <p className="mt-1 font-mono text-xs text-slate-200">{data.mobile_env_hint}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Permission</p>
                      <p className="mt-1 text-white">
                        {data.can_manage
                          ? "Modification autorisée sur ce tenant."
                          : "Lecture seule. Un rôle avec monétisation est requis."}
                      </p>
                    </div>
                  </div>

                  <Button type="button" variant="outline" onClick={() => void load()}>
                    <RefreshCw className="size-4" />
                    Recharger
                  </Button>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Policies actives et historiques</p>
                  <p className="text-sm text-slate-400">
                    Périmètre Celtiis appliqué à l’espace actif.
                  </p>
                </div>
                <Badge variant="secondary">{data.policies.length} policy(s)</Badge>
              </div>

              {data.policies.length === 0 ? (
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                  Aucune policy Celtiis n’est encore configurée pour ce tenant.
                </div>
              ) : (
                <div className="grid gap-3">
                  {data.policies.map((policy) => (
                    <article
                      key={policy.id}
                      className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">
                              {policy.channel_name ?? "Chaîne inconnue"}
                            </p>
                            <Badge variant={policy.active ? "default" : "outline"}>
                              {policy.active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="secondary">
                              {policy.decision_mode === "partner_bypass"
                                ? "Partner bypass"
                                : "Sponsoring data"}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                            <span>Direct : {policy.stream_title ?? "Toute la chaîne"}</span>
                            <span>Pays: {policy.allowed_country_iso2 ?? "--"}</span>
                            <span>Mise à jour : {formatDateTime(policy.updated_at)}</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void togglePolicy(policy)}
                          disabled={Boolean(togglingId) || !data.can_manage}
                        >
                          {togglingId === policy.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Power className="size-4" />
                          )}
                          {policy.active ? "Désactiver" : "Réactiver"}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

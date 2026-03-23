"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  Shield,
  Smartphone,
  User2,
} from "lucide-react";

import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { SponsorshipPilotCard } from "@/components/settings/sponsorship-pilot-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatRoleLabel } from "@/lib/console-branding";

type UserInfo = { id: string; email: string | null; tenant_id: string | null; role: string | null };
type TenantInfo = { id: string; name: string; created_at: string; created_by: string | null };
type IngestInfo = {
  configured: boolean;
  source: "db" | "env" | "none";
  canRotate: boolean;
  requiresMigration: boolean;
  created_at?: string;
  rotated_at?: string;
};

function roleLabel(role?: string | null) {
  return formatRoleLabel(role);
}

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

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
      <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className={cn("truncate text-sm text-white", mono && "font-mono")}>{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [ingest, setIngest] = useState<IngestInfo | null>(null);

  const [tenantName, setTenantName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIngestKey, setNewIngestKey] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingTenant, setSavingTenant] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [rotatingIngest, setRotatingIngest] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const pwdOk = useMemo(() => newPassword.length >= 8, [newPassword]);

  const load = async () => {
    setLoading(true);
    setErr("");
    setMsg("");
    setNewIngestKey("");

    try {
      const [uRes, tRes, iRes] = await Promise.all([
        fetch("/api/settings/user", { cache: "no-store" }),
        fetch("/api/settings/tenant", { cache: "no-store" }),
        fetch("/api/settings/ingest-key", { cache: "no-store" }),
      ]);

      const uJson = await uRes.json().catch(() => null);
      const tJson = await tRes.json().catch(() => null);
      const iJson = await iRes.json().catch(() => null);

      if (uRes.ok && uJson?.ok) setUser(uJson.user);
      if (tRes.ok && tJson?.ok) {
        setTenant(tJson.tenant);
        setTenantName(tJson.tenant?.name ?? "");
      }
      if (iRes.ok && iJson?.ok) {
        setIngest(iJson.ingest);
      }
    } catch {
      setErr("Impossible de charger les paramètres.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveTenant = async () => {
    setSavingTenant(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/settings/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tenantName }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Erreur");
      setTenant(json.tenant);
      setMsg("Organisation mise à jour.");
    } catch (error) {
      setErr(getErrorMessage(error, "Erreur de mise à jour de l’organisation."));
    } finally {
      setSavingTenant(false);
    }
  };

  const changePassword = async () => {
    setSavingPwd(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Erreur");
      setNewPassword("");
      setMsg("Mot de passe mis à jour.");
    } catch (error) {
      setErr(getErrorMessage(error, "Erreur de mise à jour du mot de passe."));
    } finally {
      setSavingPwd(false);
    }
  };

  const rotateIngestKey = async () => {
    setRotatingIngest(true);
    setErr("");
    setMsg("");
    setNewIngestKey("");
    try {
      const res = await fetch("/api/settings/ingest-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "manual_rotation" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Erreur");
      setIngest(json.ingest);
      setNewIngestKey(json.key || "");
      setMsg("Clé ingest régénérée. Copiez-la maintenant.");
    } catch (error) {
      setErr(getErrorMessage(error, "Erreur de rotation de la clé ingest."));
    } finally {
      setRotatingIngest(false);
    }
  };

  const copyIngestKey = async () => {
    if (!newIngestKey) return;
    try {
      await navigator.clipboard.writeText(newIngestKey);
      setMsg("Clé ingest copiée.");
    } catch {
      setErr("Impossible de copier la clé.");
    }
  };

  const ingestStatusLabel = useMemo(() => {
    if (ingest?.configured) return "Configuré";
    if (ingest?.requiresMigration) return "Migration requise";
    return "Non configuré";
  }, [ingest]);

  const ingestSourceLabel = useMemo(() => {
    if (!ingest) return "-";
    if (ingest.source === "db") return "Base de données";
    if (ingest.source === "env") return "Variable d’environnement";
    return "Aucune";
  }, [ingest]);

  const ingestRotatedLabel = useMemo(() => formatDateTime(ingest?.rotated_at ?? ingest?.created_at), [ingest?.created_at, ingest?.rotated_at]);
  const createdAtLabel = useMemo(() => formatDateTime(tenant?.created_at), [tenant?.created_at]);

  if (loading) {
    return (
      <PageShell>
        <PageHeader
          title="Sécurité et paramètres"
          subtitle="Chargement du poste opérateur, de l’espace actif et des secrets applicatifs."
          breadcrumbs={[{ label: "Oniix Console", href: "/dashboard" }, { label: "Paramètres" }]}
          icon={<Shield className="size-5" />}
        />
        <Card>
          <CardContent className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" />
            Chargement en cours...
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Sécurité et paramètres"
        subtitle="Compte opérateur, espace actif et secrets applicatifs dans une vue de gouvernance unique."
        breadcrumbs={[{ label: "Oniix Console", href: "/dashboard" }, { label: "Paramètres" }]}
        icon={<Shield className="size-5" />}
        actions={
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            Recharger
          </Button>
        }
      />

      {(err || msg) && (
        <section
          className={cn(
            "console-panel flex items-start gap-3 px-5 py-4",
            err ? "border-rose-500/20 bg-rose-500/10" : "border-emerald-400/18 bg-emerald-500/10"
          )}
        >
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-[18px] border",
              err
                ? "border-rose-500/20 bg-rose-500/14 text-rose-100"
                : "border-emerald-400/20 bg-emerald-500/14 text-emerald-100"
            )}
          >
            {err ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
          </span>
          <div className="space-y-1">
            <p className={cn("text-sm font-semibold", err ? "text-rose-100" : "text-emerald-50")}>
              {err ? "Action interrompue" : "Action confirmée"}
            </p>
            <p className={cn("text-sm", err ? "text-rose-100/75" : "text-emerald-100/75")}>{err || msg}</p>
          </div>
        </section>
      )}

      <KpiRow>
        <KpiCard
          label="Compte"
          value={user?.email ?? "-"}
          hint={`Rôle ${user?.role ? roleLabel(user.role) : "-"}`}
          icon={<User2 className="size-4" />}
        />
        <KpiCard
          label="Espace actif"
          value={tenant?.name ?? "-"}
          hint={`Création ${createdAtLabel}`}
          icon={<Building2 className="size-4" />}
          tone="info"
        />
        <KpiCard
          label="Ingest"
          value={ingestStatusLabel}
          hint={`Source ${ingestSourceLabel}`}
          icon={<Smartphone className="size-4" />}
          tone={ingest?.configured ? "success" : ingest?.requiresMigration ? "warning" : "neutral"}
        />
        <KpiCard
          label="Dernière rotation"
          value={ingestRotatedLabel}
          hint="Lecture du secret applicatif courant."
          icon={<RefreshCw className="size-4" />}
        />
      </KpiRow>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User2 className="size-4" />
              Compte opérateur
            </CardTitle>
            <CardDescription>Identité de connexion actuellement utilisée pour piloter la console.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Email" value={user?.email ?? "-"} />
            <InfoRow label="Rôle" value={user?.role ? roleLabel(user.role) : "-"} />
            <InfoRow label="Tenant" value={user?.tenant_id ?? "-"} mono />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4" />
              Espace actif
            </CardTitle>
            <CardDescription>Identité visible dans la navigation, les exports et les surfaces partagées.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.16em] text-slate-500">Nom de l’espace</label>
              <Input value={tenantName} onChange={(event) => setTenantName(event.target.value)} placeholder="Nom de l’espace" />
              <p className="text-xs text-slate-500">Ce nom structure les vues opérateur et les sorties de reporting.</p>
            </div>
            <InfoRow label="Créé le" value={createdAtLabel} />
            <div className="flex justify-end">
              <Button onClick={saveTenant} disabled={savingTenant || !tenantName.trim()}>
                {savingTenant ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="size-4" />
              Clé ingest applicative
            </CardTitle>
            <CardDescription>Secret utilisé par les applications et connecteurs pour remonter les signaux runtime.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-3">
              <InfoRow label="Etat" value={ingestStatusLabel} />
              <InfoRow label="Source" value={ingestSourceLabel} />
              <InfoRow label="Rotation" value={ingestRotatedLabel} mono />
            </div>

            {ingest?.requiresMigration ? (
              <div className="rounded-[22px] border border-amber-400/18 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                Migration requise : appliquez `docs/migrations/tenant_ingest_keys.sql` pour activer la rotation depuis la console.
              </div>
            ) : null}

            {newIngestKey ? (
              <div className="rounded-[24px] border border-emerald-400/18 bg-emerald-500/10 p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-50">Nouvelle clé sécurisée</p>
                    <p className="text-sm text-emerald-100/75">Elle n’est affichée qu’une seule fois.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input value={newIngestKey} readOnly className="font-mono text-xs" />
                    <Button type="button" variant="outline" onClick={copyIngestKey}>
                      <Copy className="size-4" />
                      Copier
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={rotateIngestKey}
                disabled={rotatingIngest || Boolean(ingest && !ingest.canRotate)}
              >
                {rotatingIngest ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Faire tourner la clé
              </Button>
            </div>
          </CardContent>
        </Card>

        <SponsorshipPilotCard />

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Sécurité d’accès
            </CardTitle>
            <CardDescription>Durcissez le poste opérateur avec un mot de passe récent et une hygiène minimale de gestion.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.16em] text-slate-500">Nouveau mot de passe</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 8 caractères"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Minimum 8 caractères.</span>
                <span className={pwdOk ? "text-emerald-300" : "text-slate-500"}>
                  {pwdOk ? "Prêt" : `${Math.max(0, 8 - newPassword.length)} restant(s)`}
                </span>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="button" variant="outline" onClick={changePassword} disabled={savingPwd || !pwdOk}>
                  {savingPwd ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  Mettre a jour
                </Button>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">Hygiène d’accès</p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li>Évitez les mots de passe réutilisés entre plusieurs outils.</li>
                  <li>Mixez lettres, chiffres et symboles sur les comptes opérateurs.</li>
                  <li>Stockez les secrets dans un gestionnaire dédié et non dans les navigateurs partagés.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  Shield,
  Building2,
  User2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type UserInfo = { id: string; email: string | null; tenant_id: string | null; role: string | null };
type TenantInfo = { id: string; name: string; created_at: string; created_by: string | null };

function roleLabel(role?: string | null) {
  const r = (role || "").toLowerCase();
  if (r === "admin") return "Administrateur";
  if (r === "member") return "Membre";
  return role || "-";
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);

  const [tenantName, setTenantName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingTenant, setSavingTenant] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const pwdOk = useMemo(() => newPassword.length >= 8, [newPassword]);

  const load = async () => {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const [uRes, tRes] = await Promise.all([
        fetch("/api/settings/user", { cache: "no-store" }),
        fetch("/api/settings/tenant", { cache: "no-store" })
      ]);

      const uJson = await uRes.json().catch(() => null);
      const tJson = await tRes.json().catch(() => null);

      if (uRes.ok && uJson?.ok) setUser(uJson.user);
      if (tRes.ok && tJson?.ok) {
        setTenant(tJson.tenant);
        setTenantName(tJson.tenant?.name ?? "");
      }
    } catch {
      setErr("Impossible de charger les paramètres.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveTenant = async () => {
    setSavingTenant(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/settings/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tenantName })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Erreur");
      setTenant(json.tenant);
      setMsg("Organisation mise à jour.");
    } catch (e: any) {
      setErr(e?.message || "Erreur mise à jour organisation");
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
        body: JSON.stringify({ newPassword })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Erreur");
      setNewPassword("");
      setMsg("Mot de passe modifié.");
    } catch (e: any) {
      setErr(e?.message || "Erreur changement mot de passe");
    } finally {
      setSavingPwd(false);
    }
  };

  const createdAtLabel = useMemo(() => {
    if (!tenant?.created_at) return "—";
    try {
      return new Date(tenant.created_at).toLocaleString();
    } catch {
      return tenant.created_at;
    }
  }, [tenant?.created_at]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Subtle background */}
      <div className="fixed inset-0 -z-10 bg-zinc-950" />
      <div className="fixed inset-0 -z-10 opacity-60 [background:radial-gradient(900px_circle_at_15%_0%,rgba(99,102,241,0.14),transparent_55%),radial-gradient(900px_circle_at_85%_25%,rgba(16,185,129,0.07),transparent_55%)]" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-4 bg-zinc-950/70 backdrop-blur-xl border-b border-white/5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  Paramètres
                </h1>
                <p className="text-sm text-zinc-400">
                  Compte, organisation et sécurité.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={load}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 w-full md:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recharger
              </Button>
            </div>
          </div>

          {(err || msg) && (
            <div
              className={cn(
                "mt-4 rounded-xl border px-4 py-3 text-sm flex items-start gap-3",
                err
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-200"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
              )}
            >
              {err ? (
                <AlertTriangle className="h-4 w-4 mt-0.5 text-rose-300" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-300" />
              )}
              <div className="flex-1">{err || msg}</div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Account */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <User2 className="h-4 w-4 text-indigo-300" />
                Compte
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Informations du compte.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-zinc-950/30 overflow-hidden">
                <Row label="Email" value={user?.email ?? "-"} />
                <Divider />
                <Row label="Role" value={user?.role ? roleLabel(user.role) : "-"} />
              </div>
            </CardContent>
          </Card>

          {/* Organisation */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-300" />
                Organisation
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Parametres de l'organisation.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-widest text-zinc-500">
                  Nom de l’organisation
                </label>
                <Input
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="bg-zinc-950/40 border-white/10"
                  placeholder="Mon organisation"
                />
                <p className="text-xs text-zinc-500">
                  Ce nom peut apparaître dans la navigation et les exports.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-950/30 overflow-hidden">
                <Row label="Créé le" value={createdAtLabel} />
              </div>

              <div className="flex items-center justify-end">
                <Button
                  onClick={saveTenant}
                  disabled={savingTenant || !tenantName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {savingTenant ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-300" />
                Sécurité
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Mettre à jour votre mot de passe.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-zinc-500">
                  Nouveau mot de passe
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-zinc-950/40 border-white/10"
                  placeholder="Minimum 8 caractères"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Minimum 8 caractères.</span>
                  <span className={pwdOk ? "text-emerald-300" : "text-zinc-500"}>
                    {pwdOk ? "OK" : `${Math.max(0, 8 - newPassword.length)} restant(s)`}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-4 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-white">
                    Recommandations
                  </div>
                  <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                    <li>Évitez les mots de passe réutilisés.</li>
                    <li>Mélangez lettres, chiffres et symboles.</li>
                    <li>Utilisez un gestionnaire de mots de passe.</li>
                  </ul>
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    onClick={changePassword}
                    disabled={savingPwd || !pwdOk}
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
                  >
                    {savingPwd ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <KeyRound className="h-4 w-4 mr-2" />
                    )}
                    Changer le mot de passe
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  action
}: {
  label: string;
  value: string;
  mono?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("text-sm text-zinc-200 truncate", mono && "font-mono")}>
          {value}
        </span>
        {action}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-white/10" />;
}

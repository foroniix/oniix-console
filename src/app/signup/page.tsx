"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Loader2, Lock, Mail, ShieldCheck, User2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PASSWORD_RULES = [
  { id: "length", label: "12 caracteres minimum", test: (value: string) => value.length >= 12 },
  { id: "lower", label: "une minuscule", test: (value: string) => /[a-z]/.test(value) },
  { id: "upper", label: "une majuscule", test: (value: string) => /[A-Z]/.test(value) },
  { id: "number", label: "un chiffre", test: (value: string) => /\d/.test(value) },
  { id: "symbol", label: "un caractere special", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        {children}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [orgName, setOrgName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const checks = React.useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, valid: rule.test(password) })),
    [password]
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!acceptedTerms) {
      setError("Vous devez accepter les conditions pour creer un espace.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (checks.some((rule) => !rule.valid)) {
      setError("Le mot de passe ne respecte pas le niveau de securite requis.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          tenantName: orgName,
          email,
          password,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; message?: string; requires_email_confirmation?: boolean }
        | null;

      if (!res.ok || !json?.ok) {
        setError(json?.error || "Inscription impossible.");
        return;
      }

      if (json.requires_email_confirmation) {
        setSuccess(
          json.message ||
            "Compte cree. Verifiez votre email pour confirmer votre adresse avant votre premiere connexion."
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erreur d'inscription. Reessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow="Creation d'espace"
      title="Lancez votre espace Oniix."
      subtitle="Configurez votre organisation, securisez les acces et demarrez avec une base propre pour l'exploitation OTT."
      footer={
        <div className="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Deja equipe ?{" "}
            <Link href="/login" className="font-semibold text-[var(--brand-primary)] hover:text-white">
              Se connecter
            </Link>
          </p>
          <span className="inline-flex items-center gap-2 text-slate-400">
            <ShieldCheck className="size-4 text-[var(--brand-primary)]" />
            Onboarding structure
          </span>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nom complet" icon={User2}>
            <Input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Prenom Nom"
              className="pl-11"
            />
          </Field>

          <Field label="Organisation" icon={Building2}>
            <Input
              type="text"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="Nom de votre chaine ou groupe"
              required
              className="pl-11"
            />
          </Field>
        </div>

        <Field label="Email professionnel" icon={Mail}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nom@organisation.tv"
            required
            className="pl-11"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Mot de passe" icon={Lock}>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Choisissez un mot de passe fort"
              required
              className="pl-11"
            />
          </Field>

          <Field label="Confirmation" icon={Lock}>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Retapez le mot de passe"
              required
              className="pl-11"
            />
          </Field>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <div className="text-sm font-semibold text-white">Niveau de securite requis</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {checks.map((rule) => (
              <div key={rule.id} className="inline-flex items-center gap-2 text-sm text-slate-300">
                <span
                  className={
                    rule.valid
                      ? "inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-300"
                      : "inline-flex size-5 items-center justify-center rounded-full bg-white/8 text-slate-500"
                  }
                >
                  <CheckCircle2 className="size-3.5" />
                </span>
                {rule.label}
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5 size-4 rounded border-white/15 bg-transparent text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
          />
          <span>J&apos;accepte les conditions d&apos;utilisation et la creation securisee de mon espace Oniix.</span>
        </label>

        {error ? (
          <div className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        <Button type="submit" disabled={isLoading} className="h-11 w-full">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Creer mon espace
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </AuthFrame>
  );
}

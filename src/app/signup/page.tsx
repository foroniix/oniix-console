"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PASSWORD_RULES = [
  { id: "length", label: "12 caractères minimum", test: (value: string) => value.length >= 12 },
  { id: "lower", label: "au moins une minuscule", test: (value: string) => /[a-z]/.test(value) },
  { id: "upper", label: "au moins une majuscule", test: (value: string) => /[A-Z]/.test(value) },
  { id: "number", label: "au moins un chiffre", test: (value: string) => /\d/.test(value) },
  { id: "symbol", label: "au moins un caractère spécial", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
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
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
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
      setError("Vous devez accepter les conditions d’utilisation pour créer un espace.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (checks.some((rule) => !rule.valid)) {
      setError("Le mot de passe ne respecte pas encore le niveau de sécurité requis.");
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
            "Compte créé. Vérifiez votre email pour confirmer votre adresse avant votre première connexion."
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erreur d’inscription. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow="Création d’espace"
      title="Ouvrez votre workspace Oniix avec un parcours SaaS propre et sécurisé."
      subtitle="Créez votre organisation, protégez vos accès et démarrez avec une base prête pour l’exploitation OTT."
      footer={
        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Déjà équipé ?{" "}
            <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">
              Se connecter
            </Link>
          </p>
          <span className="inline-flex items-center gap-2 text-slate-500">
            <ShieldCheck className="size-4 text-sky-600" />
            Onboarding SaaS professionnel
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
              placeholder="Prénom Nom"
              className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400"
            />
          </Field>

          <Field label="Organisation" icon={Building2}>
            <Input
              type="text"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="Nom de votre chaîne ou groupe"
              required
              className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400"
            />
          </Field>
        </div>

        <Field label="Email professionnel" icon={Mail}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
            className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400"
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
              className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400"
            />
          </Field>

          <Field label="Confirmer le mot de passe" icon={Lock}>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Retapez le mot de passe"
              required
              className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400"
            />
          </Field>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
          <div className="text-sm font-semibold text-slate-950">Niveau de sécurité requis</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {checks.map((rule) => (
              <div
                key={rule.id}
                className="inline-flex items-center gap-2 text-sm text-slate-600"
              >
                <span
                  className={
                    rule.valid
                      ? "inline-flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                      : "inline-flex size-5 items-center justify-center rounded-full bg-slate-200 text-slate-500"
                  }
                >
                  <CheckCircle2 className="size-3.5" />
                </span>
                {rule.label}
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5 size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span>
            J’accepte les conditions d’utilisation et la création sécurisée de mon espace de travail Oniix.
          </span>
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <Button type="submit" disabled={isLoading} className="h-11 w-full rounded-xl bg-sky-600 text-white hover:bg-sky-700">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Créer mon espace
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </AuthFrame>
  );
}

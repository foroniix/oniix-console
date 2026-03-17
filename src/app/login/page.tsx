"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });

      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error || "Identifiants invalides.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erreur de connexion. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow="Connexion sécurisée"
      title="Accédez à votre espace d’exploitation Oniix."
      subtitle="Connectez-vous pour retrouver vos workspaces, vos chaînes, vos analytics et vos opérations live."
      footer={
        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Nouveau sur Oniix ?{" "}
            <Link href="/signup" className="font-semibold text-sky-700 hover:text-sky-800">
              Créer un espace
            </Link>
          </p>
          <Link href="/accept-invite" className="font-medium text-slate-700 hover:text-slate-950">
            Vous avez reçu une invitation ?
          </Link>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email" icon={Mail}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            autoFocus
            className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400"
          />
        </Field>

        <Field label="Mot de passe" icon={Lock}>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Votre mot de passe"
            className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400"
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            Rester connecté sur cet appareil
          </label>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck className="size-4 text-sky-600" />
            Session protégée
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-xl bg-sky-600 text-white hover:bg-sky-700"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Continuer vers la console
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </AuthFrame>
  );
}

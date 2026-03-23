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
      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
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
      eyebrow="Connexion"
      title="Accedez a votre console."
      subtitle="Retrouvez vos espaces, vos chaînes, vos opérations live et vos rapports depuis un poste unique."
      footer={
        <div className="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Nouveau sur Oniix ?{" "}
            <Link href="/signup" className="font-semibold text-[var(--brand-primary)] hover:text-white">
              Creer un espace
            </Link>
          </p>
          <Link href="/accept-invite" className="font-medium text-slate-300 hover:text-white">
            Vous avez recu une invitation ?
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
            placeholder="nom@organisation.tv"
            autoFocus
            className="pl-11"
          />
        </Field>

        <Field label="Mot de passe" icon={Lock}>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Votre mot de passe"
            className="pl-11"
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 rounded border-white/15 bg-transparent text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
            />
            Rester connecte sur cet appareil
          </label>
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            <ShieldCheck className="size-4 text-[var(--brand-primary)]" />
            Session protegee
          </div>
        </div>

        {error ? (
          <div className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <Button type="submit" disabled={isLoading} className="h-11 w-full">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Continuer
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </AuthFrame>
  );
}

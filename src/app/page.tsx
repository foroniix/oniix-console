import Link from "next/link";
import { cookies } from "next/headers";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Building2,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
  Smartphone,
  Tv2,
  Users,
} from "lucide-react";

import { MarketingSlideshow } from "@/components/marketing/marketing-slideshow";
import { Button } from "@/components/ui/button";
import { CONSOLE_PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/console-branding";

const STATS = [
  { value: "Multi-tenant", label: "isolation workspace et rôles" },
  { value: "Temps réel", label: "live unifié web et mobile" },
  { value: "Mobile-ready", label: "playback sécurisé pour l’app" },
];

const FEATURES = [
  {
    title: "Pilotage chaîne et opérations",
    description:
      "Console d’exploitation pour gérer catalogue, diffusion, incidents, programmation et supervision OTT.",
    icon: Tv2,
  },
  {
    title: "Analytics et audience consolidées",
    description:
      "Lecture claire du live, du watch time, des plateformes et des signaux d’engagement dans une surface unique.",
    icon: Activity,
  },
  {
    title: "Contrôle d’accès SaaS",
    description:
      "Workspaces, membres, invitations, rôles et sessions protégées pour les organisations et groupes média.",
    icon: LockKeyhole,
  },
];

const SECURITY_POINTS = [
  "Authentification serveur et cookies de session httpOnly",
  "Endpoints d’authentification limités et contrôlés",
  "Parcours onboarding éditeur, invites et workspaces",
];

export default async function HomePage() {
  const accessCookieName = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(accessCookieName)?.value);
  const continueHref = hasSession ? "/dashboard" : "/login";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#f8fbff,#edf3f8)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-[460px] w-[460px] rounded-full bg-sky-200/60 blur-[120px]" />
        <div className="absolute right-0 top-24 h-[380px] w-[380px] rounded-full bg-cyan-100/70 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-emerald-100/70 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[30px] border border-white/70 bg-white/78 px-5 py-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex size-12 items-center justify-center rounded-[18px] border border-sky-200 bg-sky-50 text-sky-700">
              <Tv2 className="size-5" />
            </div>
            <div>
              <div className="text-base font-semibold">{CONSOLE_PRODUCT_NAME}</div>
              <div className="text-sm text-slate-500">Plateforme OTT SaaS pour éditeurs et chaînes TV</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
              Connexion
            </Link>
            <Button asChild variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <Link href="/signup">Créer un espace</Link>
            </Button>
            <Button asChild className="bg-sky-600 text-white hover:bg-sky-700">
              <Link href={continueHref}>
                Continuer
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              <BadgeCheck className="size-3.5" />
              Plateforme professionnelle daylight
            </div>

            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Une home publique claire pour entrer dans la console sans casser l’expérience produit.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Oniix unifie exploitation OTT, analytics live, parcours mobile et gouvernance SaaS dans une même
                plateforme conçue pour les éditeurs, les chaînes TV et leurs équipes opérations.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-white/78 px-4 py-4 shadow-sm backdrop-blur"
                >
                  <div className="text-lg font-semibold">{stat.value}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11 rounded-xl bg-sky-600 px-5 text-white hover:bg-sky-700">
                <Link href={continueHref}>
                  <PlayCircle className="size-4" />
                  Continuer
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 rounded-xl border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
              >
                <Link href="/signup">
                  <Building2 className="size-4" />
                  Créer un espace SaaS
                </Link>
              </Button>
            </div>
          </div>

          <MarketingSlideshow />
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-[28px] border border-white/70 bg-white/78 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur"
              >
                <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sky-700">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="rounded-[30px] border border-white/70 bg-white/82 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.09)] backdrop-blur">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <ShieldCheck className="size-3.5" />
              Signup SaaS sécurisé
            </div>
            <h2 className="mt-5 text-2xl font-semibold">Un parcours d’inscription propre, crédible et exploitable.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Création d’espace, mot de passe renforcé, limites de débit, sessions sécurisées et séparation claire
              entre home publique, login et onboarding.
            </p>

            <div className="mt-6 space-y-3">
              {SECURITY_POINTS.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3"
                >
                  <div className="mt-0.5 inline-flex size-8 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="text-sm text-slate-700">{point}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,#0f172a,#111827)] p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="inline-flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Users className="size-4 text-sky-300" />
                </div>
                <div className="mt-4 text-xl font-semibold">Workspaces éditeurs</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Multi-tenant propre pour équipes TV, groupes média et opérateurs.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="inline-flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Smartphone className="size-4 text-cyan-300" />
                </div>
                <div className="mt-4 text-xl font-semibold">Mobile connecté</div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Playback signé, analytics live et expérience application alignée à la console.
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Entrée plateforme</div>
                  <div className="mt-2 text-3xl font-semibold">Home publique + auth claire</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Support</div>
                  <div className="mt-2 font-semibold">{SUPPORT_EMAIL}</div>
                </div>
              </div>
              <div className="mt-4 text-sm leading-7 text-slate-300">
                L’utilisateur n’est plus projeté directement sur le login. Il entre d’abord dans un environnement
                lisible, rassurant et orienté produit, puis poursuit vers la console ou l’inscription.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

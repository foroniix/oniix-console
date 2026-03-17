import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  LockKeyhole,
  PlayCircle,
  RadioTower,
  ShieldCheck,
  Smartphone,
  Tv2,
  Users,
  Waypoints,
  Workflow,
} from "lucide-react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/console-branding";

const CONTROL_POINTS = [
  {
    title: "Live orchestration",
    body: "Chaînes, grille, états de diffusion et incidents rassemblés dans un même plan de contrôle.",
    icon: RadioTower,
  },
  {
    title: "Playback sécurisé",
    body: "Résolution signée des flux, surface web et mobile alignées, analytics reliées à la lecture réelle.",
    icon: LockKeyhole,
  },
  {
    title: "Audience unifiée",
    body: "Présence live, watch time, plateformes et sessions consolidés sans casser l’isolation tenant.",
    icon: Waypoints,
  },
];

const OPERATING_LANES = [
  {
    title: "Éditeurs & chaînes TV",
    text: "Branding, programmation, replays, équipes et gouvernance workspace dans un socle exploitable en production.",
    icon: Tv2,
  },
  {
    title: "Applications mobiles",
    text: "Playback signé, signal live, analytics runtime et expérience éditoriale raccordés à la console.",
    icon: Smartphone,
  },
  {
    title: "Ops & direction produit",
    text: "Un cockpit lisible pour piloter le direct, observer le terrain et décider sans rupture entre métiers.",
    icon: Workflow,
  },
];

export default async function HomePage() {
  const accessCookieName = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(accessCookieName)?.value);
  const continueHref = hasSession ? "/dashboard" : "/login";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#f7fbff_0%,#edf3f8_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 top-0 h-[420px] w-[420px] rounded-full bg-[#cfd8ff]/70 blur-[120px]" />
        <div className="absolute right-[-8%] top-20 h-[360px] w-[360px] rounded-full bg-cyan-100/70 blur-[130px]" />
        <div className="absolute bottom-[-8%] left-1/3 h-[320px] w-[320px] rounded-full bg-emerald-100/70 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/76 px-5 py-4 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <OniixLogo size="lg" subtitle="Operating system OTT pour éditeurs, chaînes et applications mobiles" />

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
              Connexion
            </Link>
            <Button asChild variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <Link href="/signup">Créer un espace</Link>
            </Button>
            <Button asChild className="bg-[#4056c8] text-white hover:bg-[#3148be]">
              <Link href={continueHref}>
                Continuer
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.03fr_0.97fr]">
          <div className="rounded-[36px] border border-white/80 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7ddff] bg-[#edf1ff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4056c8]">
              <BadgeCheck className="size-3.5" />
              Oniix Operating Floor
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl xl:text-[4rem]">
              Oniix pilote le direct comme un produit, pas comme un empilement d’outils.
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-[1.02rem]">
              La plateforme rassemble exploitation OTT, sécurité de lecture, analytics temps réel, programmation et
              opérations multi-tenant dans une expérience pensée pour les équipes média qui doivent agir vite et bien.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11 rounded-xl bg-[#4056c8] px-5 text-white hover:bg-[#3148be]">
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
                  Créer un workspace
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 lg:grid-cols-3">
              {CONTROL_POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <article
                    key={point.title}
                    className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-4 shadow-sm"
                  >
                    <div className="inline-flex size-10 items-center justify-center rounded-2xl border border-[#d8dfff] bg-[#eef2ff] text-[#4056c8]">
                      <Icon className="size-4" />
                    </div>
                    <h2 className="mt-4 text-base font-semibold">{point.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{point.body}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Support</div>
                <div className="mt-3 text-xl font-semibold">Un point d’appui humain pour les phases sensibles.</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Mise en route, incidents, onboarding éditeur, gouvernance et exploitation quotidienne.
                </p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#4056c8] hover:text-[#3148be]"
                >
                  {SUPPORT_EMAIL}
                  <ArrowRight className="size-4" />
                </a>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Surface d’exploitation
                </div>
                <div className="mt-4 space-y-4">
                  {OPERATING_LANES.map((lane) => {
                    const Icon = lane.icon;
                    return (
                      <div key={lane.title} className="flex gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                        <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#4056c8] shadow-sm">
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{lane.title}</div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{lane.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[36px] border border-slate-200/80 bg-[linear-gradient(180deg,#081120,#10182d)] p-4 text-white shadow-[0_28px_90px_rgba(15,23,42,0.20)]">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] p-4">
              <div className="flex items-center justify-between gap-4 px-1 pb-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Live Floor</div>
                  <div className="mt-2 text-2xl font-semibold">Une identité de produit construite pour l’OTT.</div>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
                  Daylight + secure SaaS
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#040816]">
                <video autoPlay loop muted playsInline preload="auto" className="aspect-[16/13] w-full object-cover">
                  <source src="/branding/oniix-animated.mp4" type="video/mp4" />
                </video>
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,17,32,0.06),rgba(8,17,32,0.10),rgba(8,17,32,0.55))]" />

                <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2">
                  <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-100">
                    Playback signed
                  </div>
                  <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-100">
                    Mobile + web
                  </div>
                  <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-100">
                    Multi-workspace
                  </div>
                </div>

                <div className="absolute inset-x-4 bottom-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Workspaces</div>
                    <div className="mt-2 text-sm font-semibold text-white">Isolation native</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Channels</div>
                    <div className="mt-2 text-sm font-semibold text-white">Pilotage éditorial</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Audience</div>
                    <div className="mt-2 text-sm font-semibold text-white">Signal live unifié</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Signal mobile
                </div>
                <div className="mt-3 overflow-hidden rounded-[22px] border border-white/10 bg-[#040816]">
                  <video autoPlay loop muted playsInline preload="metadata" className="aspect-[5/4] w-full object-cover">
                    <source src="/branding/oniix-logo-loop.mp4" type="video/mp4" />
                  </video>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  L’app mobile et la console ne sont plus deux mondes séparés. Oniix relie lecture, analytics et
                  exploitation dans une même trame.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Ce que la plateforme change
                </div>
                <div className="mt-4 grid gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-300">
                        <Users className="size-4" />
                      </div>
                      <div className="text-base font-semibold">Pour les équipes média</div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Une expérience sérieuse, lisible et stable qui tient autant du produit SaaS que de l’outil
                      d’exploitation broadcast.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-300">
                        <ShieldCheck className="size-4" />
                      </div>
                      <div className="text-base font-semibold">Pour la sécurité et la gouvernance</div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Auth, invites, rôles, workspaces actifs et lecture signée s’alignent désormais sur une logique
                      plateforme, pas sur un prototype.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

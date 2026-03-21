import { cookies } from "next/headers";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarRange,
  ChartColumnIncreasing,
  Clock3,
  LockKeyhole,
  PlayCircle,
  RadioTower,
  ShieldCheck,
  Smartphone,
  Tv2,
  Users,
} from "lucide-react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { ConsoleFooter } from "@/components/legal/console-footer";
import { SupportMailLink } from "@/components/support/support-mail-link";
import { Button } from "@/components/ui/button";

const PLATFORM_AREAS = [
  {
    title: "Exploitation live",
    description: "Surveillance des chaînes, états de diffusion, incidents, reprise et lecture de santé dans une même boucle.",
    icon: RadioTower,
  },
  {
    title: "Programmation TV",
    description: "Programmes, diffusions, publication, grille mobile et continuité entre préparation éditoriale et lecture réelle.",
    icon: CalendarRange,
  },
  {
    title: "Distribution et players",
    description: "Playback signé, alignement web et mobile, contrôles d'accès, analytics runtime et cohérence multi-tenant.",
    icon: Smartphone,
  },
  {
    title: "Pilotage d'équipe",
    description: "Espaces, rôles, activités, notifications, support et gouvernance exploitable au quotidien par les éditeurs.",
    icon: Users,
  },
];

const CONTROL_BOARD = [
  {
    label: "Espace actif",
    value: "Régie multi-tenant",
    meta: "Chaînes, rôles, diffusion et analytics sur une même surface.",
    icon: Building2,
  },
  {
    label: "Chaîne en cours",
    value: "Live, now/next, reprise",
    meta: "La console doit piloter la chaîne comme un vrai poste d'exploitation.",
    icon: Tv2,
  },
  {
    label: "Audience",
    value: "Web + mobile consolidés",
    meta: "Présence live, watch time, répartition appareils et signaux runtime sans doubles sources.",
    icon: ChartColumnIncreasing,
  },
];

const EXECUTION_STEPS = [
  "Préparer un programme et sa diffusion sur la bonne chaîne.",
  "Publier le direct et suivre l'état technique sans changer d'écran.",
  "Lire l'audience live et la ventilation web / mobile sans angle mort.",
  "Tracer les activités, incidents et décisions dans un historique exploitable.",
];

const TRUST_SIGNALS = [
  {
    title: "Sécurité plateforme",
    body: "Sessions protégées, rôles isolés, tenancy appliquée côté backend et accès cohérents entre console et application.",
    icon: LockKeyhole,
  },
  {
    title: "Cadre opérateur",
    body: "Support, footer, pages légales, cookies et langage produit cohérent au lieu d'une interface laissée à l'état de prototype.",
    icon: ShieldCheck,
  },
  {
    title: "Temps réel exploitable",
    body: "La valeur n'est pas d'avoir des cartes animées, mais des signaux fiables pour prendre une décision pendant un direct.",
    icon: BellRing,
  },
];

const HOME_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Oniix",
      url: "https://oniix.space",
      email: "support@oniix.space",
      logo: "https://oniix.space/icon.svg",
      sameAs: ["https://oniix.space"],
    },
    {
      "@type": "WebSite",
      name: "Oniix",
      url: "https://oniix.space",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://oniix.space/login",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      name: "Oniix",
      description:
        "Plateforme OTT pour chaînes TV, éditeurs, programmation, diffusion sécurisée et analytics web/mobile.",
      url: "https://oniix.space",
    },
  ],
};

export default async function HomePage() {
  const accessCookieName = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(accessCookieName)?.value);
  const continueHref = hasSession ? "/dashboard" : "/login";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(109,130,255,0.12),transparent_24%),linear-gradient(180deg,#06101b,#0a1320_46%,#0d1724)] text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_STRUCTURED_DATA) }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-[360px] w-[360px] rounded-full bg-[#223b77]/28 blur-[120px]" />
        <div className="absolute right-[-8%] top-16 h-[320px] w-[320px] rounded-full bg-[#164e63]/16 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-[#223249] bg-[rgba(10,18,30,0.84)] px-5 py-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <OniixLogo size="lg" subtitle="Console OTT pour chaînes, éditeurs et exploitation multi-équipe" />

          <div className="flex flex-wrap items-center gap-3">
            <SupportMailLink className="text-sm font-medium text-slate-300 transition hover:text-white">
              Support
            </SupportMailLink>
            <Link href="/login" className="text-sm font-medium text-slate-300 transition hover:text-white">
              Connexion
            </Link>
            <Button
              asChild
              variant="outline"
              className="border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-100 hover:bg-white/6"
            >
              <Link href="/signup">Créer un espace</Link>
            </Button>
            <Button asChild className="bg-[#4f67d9] text-white hover:bg-[#5c76f2]">
              <Link href={continueHref}>
                Continuer
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="console-hero p-6 sm:p-8">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#223249] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Console de pilotage OTT
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-5xl xl:text-[4rem]">
                {
                  "Une console conçue pour exploiter des chaînes TV, pas pour jouer le rôle d'une vitrine."
                }
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-[1.02rem]">
                {
                  "Oniix doit servir la production, la régie, la distribution et la lecture d'audience comme un outil de travail sérieux. La page d'entrée présente donc le produit comme un poste opérateur: clair, dense, crédible et immédiatement orienté vers l'action."
                }
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11 rounded-xl bg-[#4f67d9] px-5 text-white hover:bg-[#5c76f2]">
                <Link href={continueHref}>
                  <PlayCircle className="size-4" />
                  Entrer dans la console
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 rounded-xl border-[#223249] bg-[rgba(255,255,255,0.03)] px-5 text-slate-100 hover:bg-white/6"
              >
                <Link href="/signup">
                  <Building2 className="size-4" />
                  Ouvrir un espace éditeur
                </Link>
              </Button>
              <SupportMailLink className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#223249] px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/6 hover:text-[#9cbcff]">
                <ShieldCheck className="size-4" />
                Parler au support
              </SupportMailLink>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] border border-[#223249] bg-[rgba(255,255,255,0.03)] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cadre</div>
                <div className="mt-2 text-sm font-semibold text-white">Multi-tenant réel</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {
                    "Espaces, rôles, invitations et bascule de workspace alignés avec l'exploitation."
                  }
                </p>
              </div>
              <div className="rounded-[24px] border border-[#223249] bg-[rgba(255,255,255,0.03)] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Diffusion</div>
                <div className="mt-2 text-sm font-semibold text-white">Programmation + live</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Une seule grammaire entre la grille TV, la diffusion, le replay et la lecture mobile.
                </p>
              </div>
              <div className="rounded-[24px] border border-[#223249] bg-[rgba(255,255,255,0.03)] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Mesure</div>
                <div className="mt-2 text-sm font-semibold text-white">Analytics consolidées</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Live, watch time, web, mobile et activités tracées sans couches concurrentes.
                </p>
              </div>
            </div>
          </section>

          <aside className="console-panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Vue opérateur
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {"Ce que l'équipe doit comprendre en moins d'une minute."}
                </h2>
              </div>
              <div className="rounded-full border border-[#223249] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-slate-400">
                Entrée console
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {CONTROL_BOARD.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.label}
                    className="rounded-[24px] border border-[#223249] bg-[rgba(255,255,255,0.03)] p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#2c3f5b] bg-[#111b2a] text-[#9cbcff]">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {item.label}
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">{item.value}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{item.meta}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 rounded-[26px] border border-[#223249] bg-[linear-gradient(180deg,rgba(13,21,34,0.96),rgba(10,16,28,0.96))] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {"Boucle d'exécution"}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">De la préparation à la lecture live</div>
                </div>
                <Clock3 className="size-4 text-[#9cbcff]" />
              </div>

              <div className="mt-5 space-y-3">
                {EXECUTION_STEPS.map((step, index) => (
                  <div key={step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="inline-flex size-8 items-center justify-center rounded-full border border-[#2b3d58] bg-[#121c2b] text-xs font-semibold text-white">
                        {index + 1}
                      </div>
                      {index < EXECUTION_STEPS.length - 1 ? (
                        <div className="mt-2 h-full w-px bg-[#25364d]" />
                      ) : null}
                    </div>
                    <p className="pb-4 pt-1 text-sm leading-6 text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
          <div className="console-panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Périmètre produit
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  Les blocs métier que la console doit couvrir proprement.
                </h2>
              </div>
              <div className="rounded-full border border-[#223249] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-slate-400">
                Oniix platform
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {PLATFORM_AREAS.map((area) => {
                const Icon = area.icon;
                return (
                  <article
                    key={area.title}
                    className="rounded-[24px] border border-[#223249] bg-[rgba(255,255,255,0.03)] p-5"
                  >
                    <div className="inline-flex size-11 items-center justify-center rounded-2xl border border-[#2c3f5b] bg-[#111b2a] text-[#9cbcff]">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white">{area.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{area.description}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5">
            <div className="console-panel p-5 sm:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Ce qui crédibilise la plateforme
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Moins de rhétorique. Plus de confiance visible.
              </div>

              <div className="mt-5 space-y-3">
                {TRUST_SIGNALS.map((signal) => {
                  const Icon = signal.icon;
                  return (
                    <article
                      key={signal.title}
                      className="rounded-[22px] border border-[#223249] bg-[rgba(255,255,255,0.03)] p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#2c3f5b] bg-[#111b2a] text-[#9cbcff]">
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{signal.title}</div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{signal.body}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="console-panel p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Accès direct
                  </div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    Ouvrir la console ou lancer un espace proprement.
                  </div>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                    {
                      "La page d'accueil doit t'amener vers un produit sérieux, pas vers une vitrine décorative."
                    }
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className="border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-100 hover:bg-white/6"
                  >
                    <Link href="/login">Connexion</Link>
                  </Button>
                  <Button asChild className="bg-[#4f67d9] text-white hover:bg-[#5c76f2]">
                    <Link href={continueHref}>
                      Continuer
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ConsoleFooter className="mt-6" />
      </div>
    </main>
  );
}

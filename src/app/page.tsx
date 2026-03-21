import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarRange,
  ChartColumnIncreasing,
  LockKeyhole,
  PlayCircle,
  RadioTower,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { ConsoleFooter } from "@/components/legal/console-footer";
import { SupportMailLink } from "@/components/support/support-mail-link";
import { Button } from "@/components/ui/button";

const OPERATING_PILLARS = [
  {
    label: "Cadre",
    value: "Multi-tenant reel",
    body: "Espaces, roles et invitations alignes avec l'exploitation.",
  },
  {
    label: "Diffusion",
    value: "Programmation + live",
    body: "Une meme surface pour la grille, le direct et la reprise.",
  },
  {
    label: "Mesure",
    value: "Analytics consolidees",
    body: "Web, mobile, watch time et activite dans le meme poste.",
  },
];

const PLATFORM_AREAS = [
  {
    title: "Exploitation live",
    description: "Suivi des chaines, etats de diffusion et incidents depuis une seule boucle operateur.",
    icon: RadioTower,
  },
  {
    title: "Programmation TV",
    description: "Preparation editoriale, diffusion planifiee et continuite de grille.",
    icon: CalendarRange,
  },
  {
    title: "Distribution et players",
    description: "Playback securise, lecture web et mobile, controle d'acces et runtime.",
    icon: Smartphone,
  },
  {
    title: "Equipe et gouvernance",
    description: "Workspaces, roles, journal d'activite, notifications et support.",
    icon: Users,
  },
];

const TRUST_SIGNALS = [
  {
    title: "Acces securises",
    body: "Sessions protegees, cookies applicatifs et isolation des espaces.",
    icon: LockKeyhole,
  },
  {
    title: "Pilotage business",
    body: "Monetisation, revenus et audience lisibles sans changer d'outil.",
    icon: ChartColumnIncreasing,
  },
  {
    title: "Support plateforme",
    body: "Onboarding, incidents et support operationnel integres au produit.",
    icon: ShieldCheck,
  },
];

const EXECUTION_STEPS = [
  "Preparer un programme sur la bonne chaine.",
  "Lancer ou surveiller le direct dans la meme console.",
  "Lire l'audience live et les signaux web/mobile sans double source.",
  "Tracer les actions sensibles dans un historique exploitable.",
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
      description: "Plateforme OTT pour chaines TV, editeurs, diffusion securisee, programmation et analytics.",
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
    <main className="relative min-h-dvh overflow-hidden text-slate-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_STRUCTURED_DATA) }} />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1480px] flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="console-toolbar flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <OniixLogo size="lg" subtitle="Console OTT pour operations, programmation et revenus" />

          <div className="flex flex-wrap items-center gap-3">
            <SupportMailLink className="text-sm font-medium text-slate-300 transition hover:text-white">
              Support
            </SupportMailLink>
            <Link href="/login" className="text-sm font-medium text-slate-300 transition hover:text-white">
              Connexion
            </Link>
            <Button asChild variant="outline">
              <Link href="/signup">Creer un espace</Link>
            </Button>
            <Button asChild>
              <Link href={continueHref}>
                Continuer
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
          <section className="console-hero p-6 sm:p-8">
            <div className="max-w-4xl">
              <div className="console-chip">Plateforme OTT</div>

              <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-5xl xl:text-[4.1rem]">
                Pilotage OTT pour operations, programmation et revenus.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-[1.02rem]">
                Oniix centralise chaines, directs, planning, inventaire publicitaire et analytics dans un espace securise.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11 px-5">
                <Link href={continueHref}>
                  <PlayCircle className="size-4" />
                  Entrer dans la console
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 px-5">
                <Link href="/signup">
                  <Building2 className="size-4" />
                  Ouvrir un espace
                </Link>
              </Button>
              <SupportMailLink className="inline-flex h-11 items-center gap-2 rounded-[18px] border border-white/10 px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.05] hover:text-white">
                <ShieldCheck className="size-4 text-[var(--brand-primary)]" />
                Parler au support
              </SupportMailLink>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {OPERATING_PILLARS.map((pillar) => (
                <div key={pillar.label} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{pillar.label}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{pillar.value}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{pillar.body}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="console-panel p-5 sm:p-6">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a1119]">
              <Image
                src="/branding/editorial/oniix-signal-wall.svg"
                alt="Oniix signal wall"
                width={1600}
                height={1200}
                className="aspect-[4/3] w-full object-cover"
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,18,0.14),rgba(8,12,18,0.68))]" />
              <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white">
                  Live operations
                </span>
                <span className="rounded-full border border-[#7ab7ff]/18 bg-[#7ab7ff]/12 px-3 py-1 text-[11px] text-[#b9d8ff]">
                  Web + mobile
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {TRUST_SIGNALS.map((signal) => {
                const Icon = signal.icon;
                return (
                  <article key={signal.title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-start gap-4">
                      <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] text-[var(--brand-primary)]">
                        <Icon className="size-5" />
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
          </aside>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="console-panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Couverture produit</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Une console concue pour le travail operateur.</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-400">
                Oniix Platform
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {PLATFORM_AREAS.map((area) => {
                const Icon = area.icon;
                return (
                  <article key={area.title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="inline-flex size-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] text-[var(--brand-primary)]">
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
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Parcours operateur</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-white">Du planning a la lecture live.</div>

              <div className="mt-5 space-y-3">
                {EXECUTION_STEPS.map((step, index) => (
                  <div key={step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-white">
                        {index + 1}
                      </div>
                      {index < EXECUTION_STEPS.length - 1 ? <div className="mt-2 h-full w-px bg-white/10" /> : null}
                    </div>
                    <p className="pb-4 pt-1 text-sm leading-6 text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="console-panel p-5 sm:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Acces direct</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-white">Ouvrir la console ou lancer un espace.</div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Une entree claire pour un produit de pilotage, pas une vitrine decorative.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href="/login">Connexion</Link>
                </Button>
                <Button asChild>
                  <Link href={continueHref}>
                    Continuer
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <ConsoleFooter className="mt-6" />
      </div>
    </main>
  );
}

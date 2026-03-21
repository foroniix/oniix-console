import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Clapperboard,
  LockKeyhole,
  PlayCircle,
  RadioTower,
  ShieldCheck,
  Smartphone,
  Tv2,
  Waypoints,
} from "lucide-react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { ConsoleFooter } from "@/components/legal/console-footer";
import { SupportMailLink } from "@/components/support/support-mail-link";
import { Button } from "@/components/ui/button";

const PRODUCTION_PILLARS = [
  {
    index: "01",
    title: "Régie live",
    text: "États de diffusion, surveillance, incidents et reprise opérationnelle dans une seule vue.",
    icon: RadioTower,
  },
  {
    index: "02",
    title: "Distribution sécurisée",
    text: "Playback signé, accès contrôlé et alignement réel entre console, web et application mobile.",
    icon: LockKeyhole,
  },
  {
    index: "03",
    title: "Lecture des audiences",
    text: "Présence live, temps de visionnage, plateformes et signaux runtime consolidés sans bruit produit.",
    icon: Waypoints,
  },
];

const STUDIO_LANES = [
  {
    title: "Chaînes et éditeurs",
    body: "Branding, programmation, replays, rôles, espaces et exploitation du catalogue dans la même grammaire.",
    icon: Tv2,
  },
  {
    title: "Applications mobiles",
    body: "Le player n’est plus un satellite. La lecture, les heartbeats et les analytics vivent sur un contrat commun.",
    icon: Smartphone,
  },
  {
    title: "Direction produit et ops",
    body: "Une interface qui sert la décision et l’action, pas une couche marketing plaquée sur des écrans d’admin.",
    icon: Clapperboard,
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
        "Plateforme de pilotage OTT pour chaînes TV, programmation, analytics, distribution web et application mobile.",
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
    <main className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(74,144,226,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(33,84,164,0.10),transparent_22%),linear-gradient(180deg,#060d17,#091220_46%,#0c1626)] text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_STRUCTURED_DATA) }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[#19356a]/38 blur-[140px]" />
        <div className="absolute right-[-8%] top-20 h-[340px] w-[340px] rounded-full bg-[#0f766e]/16 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[30px] border border-[#223249] bg-[rgba(8,16,28,0.72)] px-5 py-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <OniixLogo size="lg" subtitle="Plateforme de production OTT pour chaînes, éditeurs et applications mobiles" />

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
            <Button asChild className="bg-[#3b5fa6] text-white hover:bg-[#4a72c2]">
              <Link href={continueHref}>
                Continuer
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="overflow-hidden rounded-[38px] border border-[#223249] bg-[linear-gradient(180deg,rgba(9,16,28,0.96),rgba(13,23,37,0.94))] shadow-[0_28px_72px_rgba(0,0,0,0.18)]">
            <div className="grid gap-8 p-6 sm:p-8">
              <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#223249] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Maison de production Oniix
                  </div>

                  <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-white sm:text-5xl xl:text-[4.15rem]">
                    Une régie produit pour des équipes qui fabriquent, diffusent et pilotent des chaînes.
                  </h1>

                  <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-[1.02rem]">
                    Oniix ne cherche pas à ressembler à un SaaS interchangeable. La plateforme est pensée comme une
                    maison de production numérique: un poste de travail pour orchestrer le direct, relier la
                    distribution mobile et lire les signaux d’audience sans perdre la main opérationnelle.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Button asChild size="lg" className="h-11 rounded-xl bg-[#3b5fa6] px-5 text-white hover:bg-[#4a72c2]">
                      <Link href={continueHref}>
                        <PlayCircle className="size-4" />
                        Continuer
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
                        Créer un espace
                      </Link>
                    </Button>
                    <SupportMailLink className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#223249] bg-transparent px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/6 hover:text-[#7cb4ff]">
                      <ShieldCheck className="size-4" />
                      Contacter le support
                    </SupportMailLink>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#223249] bg-[rgba(16,26,42,0.88)] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Feuille de route terrain
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">Ce que la plateforme absorbe réellement</div>
                    </div>
                    <div className="rounded-full border border-[#223249] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] font-medium text-slate-400">
                      Pilotage média
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {STUDIO_LANES.map((lane) => {
                      const Icon = lane.icon;
                      return (
                        <div
                          key={lane.title}
                          className="flex gap-4 rounded-[22px] border border-[#223249] bg-[rgba(255,255,255,0.03)] p-4"
                        >
                          <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-200">
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{lane.title}</div>
                            <p className="mt-1 text-sm leading-6 text-slate-300">{lane.body}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                {PRODUCTION_PILLARS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <article
                      key={card.title}
                      className="rounded-[26px] border border-[#223249] bg-[rgba(255,255,255,0.03)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.10)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {card.index}
                        </div>
                        <div className="inline-flex size-10 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-200">
                          <Icon className="size-4" />
                        </div>
                      </div>
                      <h2 className="mt-4 text-lg font-semibold text-white">{card.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{card.text}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-[38px] border border-[#223249] bg-[linear-gradient(180deg,#10141b,#1a202c)] text-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
              <div className="grid gap-4 p-4">
                <div className="flex items-start justify-between gap-4 px-1 pt-1">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Mur de supervision</div>
                    <div className="mt-2 max-w-lg text-2xl font-semibold leading-tight">
                      Une ambiance de plateau, de régie et de distribution, pas un simple portail marketing.
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                    Cadre studio
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#040816]">
                  <Image
                    src="/branding/editorial/oniix-signal-wall.svg"
                    alt="Visuel Oniix montrant une régie live, la distribution mobile et les signaux d'audience"
                    width={1600}
                    height={1200}
                    className="aspect-[16/13] w-full object-cover"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,11,19,0.08),rgba(7,11,19,0.18),rgba(7,11,19,0.68))]" />

                  <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2">
                    <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-100">
                      Playback signé
                    </div>
                    <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-100">
                      Applications + web
                    </div>
                    <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-100">
                      Audience live
                    </div>
                  </div>

                  <div className="absolute inset-x-4 bottom-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Chaînes</div>
                      <div className="mt-2 text-sm font-semibold text-white">Pilotage éditorial</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Programme</div>
                      <div className="mt-2 text-sm font-semibold text-white">Cadence maîtrisée</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Audience</div>
                      <div className="mt-2 text-sm font-semibold text-white">Lecture consolidée</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
              <div className="rounded-[30px] border border-[#223249] bg-[rgba(16,26,42,0.86)] p-5 shadow-[0_18px_52px_rgba(0,0,0,0.16)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Post-production</div>
                <div className="mt-3 overflow-hidden rounded-[24px] border border-[#223249] bg-[#0b1020]">
                  <Image
                    src="/branding/editorial/oniix-mobile-command.svg"
                    alt="Visuel Oniix montrant le lien entre l'application mobile, le playback et l'analytics"
                    width={1200}
                    height={1200}
                    className="aspect-[5/4] w-full object-cover"
                  />
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  L’application et la console ne vivent plus côte à côte. La lecture, les events runtime et l’analytics
                  doivent partager le même récit produit.
                </p>
              </div>

              <div className="rounded-[30px] border border-[#223249] bg-[rgba(10,18,30,0.86)] p-5 shadow-[0_18px_52px_rgba(0,0,0,0.16)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cadence Oniix</div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#223249] bg-[rgba(255,255,255,0.03)] p-4">
                      <div className="flex items-center gap-3">
                        <CalendarClock className="size-4 text-[#7cb4ff]" />
                        <div className="text-sm font-semibold text-white">Programmation et diffusion dans la même boucle</div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        L’outil doit ressembler à la réalité métier: préparer, lancer, surveiller, rejouer, mesurer.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#223249] bg-[rgba(255,255,255,0.03)] p-4">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="size-4 text-[#7cb4ff]" />
                        <div className="text-sm font-semibold text-white">Sécurité de plateforme, pas vernis marketing</div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        Authentification, rôles, invitations, tenancy et lecture signée doivent se sentir sérieux au premier regard.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-[#223249] bg-[#151922]">
                    <Image
                      src="/branding/editorial/oniix-control-room.svg"
                      alt="Visuel Oniix montrant la programmation, l'analyse et le pilotage des chaînes"
                      width={1200}
                      height={1200}
                      className="h-full w-full object-cover"
                    />
                  </div>
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

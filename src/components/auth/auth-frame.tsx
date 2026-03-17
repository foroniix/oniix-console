import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { SupportMailLink } from "@/components/support/support-mail-link";
import { SUPPORT_EMAIL } from "@/lib/console-branding";

type AuthFrameProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

const TRUST_POINTS = [
  "Sessions applicatives protégées par cookies httpOnly",
  "Rôles et isolation workspace appliqués côté backend",
  "Onboarding éditeur, invitations et accès consolidés",
];

export function AuthFrame({ eyebrow, title, subtitle, children, footer }: AuthFrameProps) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[#d7deff]/70 blur-[120px]" />
        <div className="absolute right-0 top-20 h-[360px] w-[360px] rounded-full bg-[#d7ece5]/55 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-[340px] w-[340px] rounded-full bg-[#efe2cd]/50 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.03fr_0.97fr]">
          <section className="hidden rounded-[36px] border border-[#d8cdbe] bg-[linear-gradient(180deg,rgba(243,236,226,0.92),rgba(234,224,211,0.92))] p-8 shadow-[0_30px_90px_rgba(39,37,33,0.12)] backdrop-blur lg:flex lg:flex-col">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-[#d8cdbe] bg-[rgba(250,245,238,0.88)] px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
              >
                <ArrowLeft className="size-4" />
                Retour à l’accueil
              </Link>

              <SupportMailLink className="inline-flex items-center gap-2 rounded-full border border-[#d8cdbe] bg-[rgba(250,245,238,0.75)] px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white">
                {SUPPORT_EMAIL}
              </SupportMailLink>
            </div>

            <div className="mt-8">
              <OniixLogo size="lg" subtitle="Poste de pilotage OTT, mobile et audience" />
            </div>

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8cdbe] bg-[rgba(250,245,238,0.72)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d655c]">
                {eyebrow}
              </div>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.035em] text-slate-950">
                {title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#60594f]">{subtitle}</p>
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
              <div className="relative overflow-hidden rounded-[30px] border border-[#1f232b] bg-[#0d121b]">
                <Image
                  src="/branding/stills/broadcast-control-room.jpg"
                  alt="Régie broadcast avec mur d'écrans et instrumentation de diffusion"
                  width={1000}
                  height={750}
                  className="aspect-[4/5] w-full object-cover"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,18,0.10),rgba(8,12,18,0.18),rgba(8,12,18,0.75))]" />
                <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white">
                    Oniix signal
                  </span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-200">
                    Secure access
                  </span>
                </div>
                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Cadre opérateur</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    Une entrée qui ressemble à une plateforme média sérieuse, pas à un tunnel générique.
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-[28px] border border-[#d8cdbe] bg-[#101522]">
                  <Image
                    src="/branding/stills/post-production-suite.jpg"
                    alt="Suite de post-production avec moniteurs d'étalonnage et station de travail"
                    width={1000}
                    height={1500}
                    className="aspect-[5/4] w-full object-cover"
                  />
                </div>

                <div className="rounded-[28px] border border-[#d8cdbe] bg-[rgba(250,245,238,0.74)] p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d655c]">
                    Confiance produit
                  </div>
                  <div className="mt-4 space-y-3">
                    {TRUST_POINTS.map((point) => (
                      <div key={point} className="flex items-start gap-3 rounded-2xl border border-[#ddd4c8] bg-white/84 px-4 py-3">
                        <div className="mt-0.5 inline-flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <CheckCircle2 className="size-4" />
                        </div>
                        <div className="text-sm leading-6 text-[#60594f]">{point}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-[#d8cdbe] pt-6 text-sm text-[#6d655c]">
              <div className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#3549be]" />
                Accès professionnels sécurisés
              </div>
              <SupportMailLink className="font-medium text-slate-700 hover:text-[#3549be]">
                {SUPPORT_EMAIL}
              </SupportMailLink>
            </div>
          </section>

          <section className="flex items-center">
            <div className="w-full rounded-[34px] border border-[#d8cdbe] bg-[rgba(247,241,234,0.92)] p-6 shadow-[0_24px_70px_rgba(39,37,33,0.12)] backdrop-blur sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#d8cdbe] bg-[rgba(250,245,238,0.78)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d655c]">
                    {eyebrow}
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#60594f]">{subtitle}</p>
                </div>

                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-[#d8cdbe] bg-[rgba(250,245,238,0.78)] px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white lg:hidden"
                >
                  <ArrowLeft className="size-4" />
                  Accueil
                </Link>
              </div>

              {children}

              <div className="mt-8 border-t border-[#d8cdbe] pt-5">{footer}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

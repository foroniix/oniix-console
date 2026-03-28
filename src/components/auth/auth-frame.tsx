import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { ConsoleFooter } from "@/components/legal/console-footer";
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
  "Connexion securisee",
  "Equipe et permissions",
  "Support Oniix centralise",
];

const CONTROL_POINTS = [
  { label: "Organisation", value: "Espace administrateur" },
  { label: "Diffusion", value: "Chaines et directs" },
  { label: "Catalogue", value: "Films et series" },
];

export function AuthFrame({ eyebrow, title, subtitle, children, footer }: AuthFrameProps) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[#1f5d9c]/26 blur-[140px]" />
        <div className="absolute right-[-8%] top-16 h-[360px] w-[360px] rounded-full bg-[#7a5930]/14 blur-[140px]" />
        <div className="absolute bottom-[-14%] left-[30%] h-[320px] w-[320px] rounded-full bg-[#1f3b66]/20 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[1560px] items-start px-4 py-6 sm:px-6 lg:px-8 xl:items-center">
        <div className="w-full space-y-6">
          <div className="grid w-full gap-6 xl:grid-cols-[1.04fr_0.96fr]">
            <section className="hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,21,31,0.92),rgba(10,16,24,0.9))] p-8 shadow-[0_34px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl xl:flex xl:flex-col">
              <div className="flex items-center justify-between gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
                >
                  <ArrowLeft className="size-4" />
                  Retour accueil
                </Link>

                <SupportMailLink className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]">
                  {SUPPORT_EMAIL}
                </SupportMailLink>
              </div>

              <div className="mt-8">
                <OniixLogo size="lg" subtitle="Administration streaming" />
              </div>

              <div className="mt-8">
                <div className="console-chip">{eyebrow}</div>
                <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white">
                  {title}
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">{subtitle}</p>
              </div>

              <div className="mt-8 grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
                <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0a1119]">
                  <Image
                    src="/branding/editorial/oniix-control-room.svg"
                    alt="Oniix control room"
                    width={1200}
                    height={1200}
                    className="aspect-[5/4] w-full object-cover"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,18,0.12),rgba(8,12,18,0.72))]" />
                  <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white">
                      Oniix
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-200">
                      Acces securise
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3">
                    {CONTROL_POINTS.map((point) => (
                      <div key={point.label} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {point.label}
                        </div>
                        <div className="mt-2 text-base font-semibold text-white">{point.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0a1119]">
                    <Image
                      src="/branding/editorial/oniix-mobile-command.svg"
                      alt="Oniix mobile command"
                      width={1200}
                      height={1200}
                      className="aspect-[5/4] w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {TRUST_POINTS.map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3"
                  >
                    <span className="mt-0.5 inline-flex size-8 items-center justify-center rounded-[14px] bg-emerald-500/10 text-emerald-300">
                      <CheckCircle2 className="size-4" />
                    </span>
                    <span className="text-sm leading-6 text-slate-300">{point}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-6 text-sm text-slate-400">
                <div className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[var(--brand-primary)]" />
                  Accompagnement Oniix
                </div>
                <SupportMailLink className="font-medium text-slate-200 hover:text-[var(--brand-primary)]">
                  {SUPPORT_EMAIL}
                </SupportMailLink>
              </div>
            </section>

            <section className="flex items-start xl:items-center">
              <div className="w-full max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,20,30,0.94),rgba(9,14,22,0.92))] p-6 shadow-[0_28px_82px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="console-chip">{eyebrow}</div>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">{title}</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">{subtitle}</p>
                  </div>

                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08] xl:hidden"
                  >
                    <ArrowLeft className="size-4" />
                    Accueil
                  </Link>
                </div>

                {children}

                <div className="mt-8 border-t border-white/10 pt-5">{footer}</div>
              </div>
            </section>
          </div>
          <ConsoleFooter compact />
        </div>
      </div>
    </div>
  );
}

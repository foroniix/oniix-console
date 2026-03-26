import Link from "next/link";
import type { ReactNode } from "react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { WebViewerShell } from "@/components/we/web-viewer-shell";

type TopicPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  highlights: Array<{ label: string; value: string; detail: string }>;
  bullets: string[];
  children?: ReactNode;
};

export function PublicTopicPage({
  eyebrow,
  title,
  description,
  image,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  highlights,
  bullets,
  children,
}: TopicPageProps) {
  return (
    <WebViewerShell>
      <main className="min-h-[calc(100dvh-76px)] text-white">
        <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,12,20,0.96),rgba(3,5,9,0.98))] p-7 shadow-[0_40px_120px_rgba(0,0,0,0.42)]">
            <div className="absolute inset-0 bg-cover bg-center opacity-24" style={{ backgroundImage: `url('${image}')` }} />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,9,0.98),rgba(3,5,9,0.76),rgba(3,5,9,0.92))]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

            <div className="relative grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="flex flex-col justify-between gap-8">
                <OniixLogo size="md" subtitle={undefined} showMark={false} className="text-white" />
                <div>
                  <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {eyebrow}
                  </div>
                  <h1 className="max-w-3xl font-[var(--font-we-display)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                    {title}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{description}</p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
                    {["Navigation claire", "Lecture immediate", "Surface publique sobre"].map((item) => (
                      <span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={primaryHref}
                    className="inline-flex h-12 items-center rounded-full bg-white px-5 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                  >
                    {primaryLabel}
                  </Link>
                  <Link
                    href={secondaryHref}
                    className="inline-flex h-12 items-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm text-slate-200 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    {secondaryLabel}
                  </Link>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Lecture publique</p>
                    <h2 className="mt-2 font-[var(--font-we-display)] text-2xl font-semibold text-white">
                      Product surface
                    </h2>
                  </div>
                  <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200">
                    Pret a diffuser
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  {highlights.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[24px] border border-white/10 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                      <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{item.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
                  Cette page detaille une entree publique Oniix avec une structure simple: acquisition, lecture,
                  reprise et navigation laterale sans surcharge visuelle.
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Pourquoi Oniix</p>
              <h2 className="mt-3 font-[var(--font-we-display)] text-2xl font-semibold text-white">
                Un portail web public pense pour le streaming.
              </h2>
              <div className="mt-5 space-y-3">
                {bullets.map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Navigation</p>
              {children}
            </div>
          </section>
        </section>
      </main>
    </WebViewerShell>
  );
}

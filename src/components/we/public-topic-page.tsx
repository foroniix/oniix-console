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
        <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-black p-7 shadow-[0_40px_120px_rgba(0,0,0,0.42)]">
            <div className="absolute inset-0 bg-cover bg-center opacity-28" style={{ backgroundImage: `url('${image}')` }} />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.96),rgba(0,0,0,0.74),rgba(0,0,0,0.92))]" />

            <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <OniixLogo size="md" subtitle={undefined} showMark={false} className="text-white" />
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {eyebrow}
                </div>
                <div>
                  <h1 className="max-w-3xl font-[var(--font-we-display)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                    {title}
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{description}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={primaryHref}
                    className="inline-flex h-12 items-center rounded-full bg-white px-5 text-sm font-medium text-black transition hover:bg-slate-200"
                  >
                    {primaryLabel}
                  </Link>
                  <Link
                    href={secondaryHref}
                    className="inline-flex h-12 items-center rounded-full border border-white/10 px-5 text-sm text-slate-200 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    {secondaryLabel}
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                {highlights.map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Pourquoi Oniix</p>
              <h2 className="mt-3 font-[var(--font-we-display)] text-2xl font-semibold text-white">
                Un portail web public pense pour le streaming.
              </h2>
              <div className="mt-5 space-y-3">
                {bullets.map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-white/10 bg-black/35 px-4 py-3 text-sm leading-6 text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
              {children}
            </div>
          </section>
        </section>
      </main>
    </WebViewerShell>
  );
}

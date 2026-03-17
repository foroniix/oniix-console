import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Tv2 } from "lucide-react";

import { MarketingSlideshow } from "@/components/marketing/marketing-slideshow";
import { CONSOLE_PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/console-branding";

type AuthFrameProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

const TRUST_POINTS = [
  "Sessions applicatives protégées par cookies httpOnly",
  "Limitation de débit sur les endpoints d’authentification",
  "Isolation workspace et rôles SaaS côté backend",
];

export function AuthFrame({ eyebrow, title, subtitle, children, footer }: AuthFrameProps) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#f7fbff,#edf3f8)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-sky-200/60 blur-[120px]" />
        <div className="absolute right-0 top-20 h-[360px] w-[360px] rounded-full bg-cyan-200/40 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-emerald-100/70 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="hidden rounded-[34px] border border-white/70 bg-white/72 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur lg:flex lg:flex-col">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="size-4" />
                Retour à l’accueil
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                <Sparkles className="size-3.5" />
                {eyebrow}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="inline-flex size-12 items-center justify-center rounded-[18px] border border-sky-200 bg-sky-50 text-sky-700">
                <Tv2 className="size-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-slate-950">{CONSOLE_PRODUCT_NAME}</div>
                <div className="text-sm text-slate-500">Control plane OTT et mobile</div>
              </div>
            </div>

            <div className="mt-8">
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950">{title}</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">{subtitle}</p>
            </div>

            <div className="mt-8">
              <MarketingSlideshow compact />
            </div>

            <div className="mt-6 grid gap-3">
              {TRUST_POINTS.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3"
                >
                  <div className="mt-0.5 inline-flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="text-sm text-slate-700">{point}</div>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-6 text-sm text-slate-500">
              <div className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-sky-600" />
                Accès professionnels sécurisés
              </div>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-slate-700 hover:text-sky-700">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </section>

          <section className="flex items-center">
            <div className="w-full rounded-[34px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {eyebrow}
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
                </div>

                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:hidden"
                >
                  <ArrowLeft className="size-4" />
                  Accueil
                </Link>
              </div>

              {children}

              <div className="mt-8 border-t border-slate-200 pt-5">{footer}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

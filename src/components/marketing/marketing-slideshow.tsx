"use client";

import * as React from "react";
import Image from "next/image";
import { BarChart3, PlayCircle, ShieldCheck, Tv2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type MarketingSlide = {
  eyebrow: string;
  title: string;
  description: string;
  imageSrc: string;
  metric: string;
  metricLabel: string;
  icon: "tv" | "analytics" | "security";
};

export const MARKETING_SLIDES: MarketingSlide[] = [
  {
    eyebrow: "Pilotage live",
    title: "Supervisez vos chaînes TV depuis une seule surface produit.",
    description:
      "Monitoring, programmation, incidents et analytics en direct pour les opérations OTT multi-chaînes.",
    imageSrc:
      "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1800&q=80",
    metric: "99,95 %",
    metricLabel: "Disponibilité ciblée",
    icon: "tv",
  },
  {
    eyebrow: "Croissance data",
    title: "Unifiez audience, watch time et monétisation mobile dans un même cockpit.",
    description:
      "Lecture claire des signaux clés pour piloter acquisition, engagement et revenus publicitaires.",
    imageSrc:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1800&q=80",
    metric: "35 s",
    metricLabel: "Fenêtre live unifiée",
    icon: "analytics",
  },
  {
    eyebrow: "Sécurité SaaS",
    title: "Accès, workspaces et sessions renforcés pour les équipes éditeurs.",
    description:
      "Parcours d’authentification propre, isolation tenant et accès sécurisés pour un SaaS exploitable en production.",
    imageSrc:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1800&q=80",
    metric: "HTTP-only",
    metricLabel: "Sessions protégées",
    icon: "security",
  },
];

function slideIcon(icon: MarketingSlide["icon"]) {
  if (icon === "analytics") return BarChart3;
  if (icon === "security") return ShieldCheck;
  return Tv2;
}

export function MarketingSlideshow({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (reduceMotion?.matches || paused) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % MARKETING_SLIDES.length);
    }, 4800);

    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/80 shadow-[0_26px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none",
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={cn("relative overflow-hidden", compact ? "h-[280px] sm:h-[320px]" : "h-[360px] sm:h-[460px]")}>
        {MARKETING_SLIDES.map((slide, slideIndex) => {
          const Icon = slideIcon(slide.icon);
          const active = slideIndex === index;

          return (
            <div
              key={slide.title}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                active ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <Image
                src={slide.imageSrc}
                alt={slide.title}
                fill
                priority={slideIndex === 0}
                className="object-cover"
                sizes={compact ? "(max-width: 1024px) 100vw, 520px" : "(max-width: 1024px) 100vw, 720px"}
              />

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(15,23,42,0.18)),linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.76))]" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20" />

              <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                  <Icon className="size-3.5" />
                  {slide.eyebrow}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-slate-950/35 px-3 py-1 text-[11px] text-white backdrop-blur">
                  <PlayCircle className="size-3.5 text-sky-300" />
                  {paused ? "Lecture manuelle" : "Diaporama actif"}
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div className="max-w-2xl">
                    <h3 className="text-xl font-semibold leading-tight text-white sm:text-2xl">{slide.title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">{slide.description}</p>
                  </div>

                  <div className="min-w-[164px] rounded-2xl border border-white/20 bg-white/12 px-4 py-3 text-white backdrop-blur">
                    <div className="text-2xl font-semibold">{slide.metric}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-200">{slide.metricLabel}</div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {MARKETING_SLIDES.map((dot, dotIndex) => (
                      <button
                        key={dot.title}
                        type="button"
                        aria-label={`Afficher le slide ${dotIndex + 1}`}
                        onClick={() => setIndex(dotIndex)}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          dotIndex === index ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                        )}
                      />
                    ))}
                  </div>

                  <div className="text-xs text-slate-200">
                    {index + 1}/{MARKETING_SLIDES.length}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

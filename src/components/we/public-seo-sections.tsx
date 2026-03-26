import Link from "next/link";
import { ArrowRight, CheckCircle2, PlayCircle, Radio, Tv2 } from "lucide-react";

const PHOTO_WALL = "/branding/photography/rural-broadband-data-center.jpg";
const PHOTO_FIELD = "/branding/photography/fiber-field-work.jpg";
const PHOTO_TOWER = "/branding/photography/communications-tower.jpg";

const PILLARS = [
  {
    label: "Direct",
    title: "Lecture immediate",
    detail: "Les chaines actives restent accessibles sans noyer l utilisateur dans des modules secondaires.",
    icon: Radio,
  },
  {
    label: "Replay",
    title: "Reprise naturelle",
    detail: "Le rattrapage et la progression prolongent le direct dans le meme parcours public.",
    icon: PlayCircle,
  },
  {
    label: "Catalogue",
    title: "Bascule vers la VOD",
    detail: "Films, series et collections gardent la meme logique de navigation que la home live.",
    icon: Tv2,
  },
] as const;

const TOPICS = [
  {
    href: "/streaming",
    label: "Streaming web",
    title: "Une plateforme publique pour le live, le replay et la VOD",
    detail: "Vue d ensemble du produit Oniix cote visionnage.",
    image: PHOTO_WALL,
  },
  {
    href: "/tv-live",
    label: "TV en direct",
    title: "Des chaines live lisibles et tout de suite actionnables",
    detail: "Acces rapide aux directs depuis le navigateur.",
    image: PHOTO_TOWER,
  },
  {
    href: "/films-series",
    label: "Films et series",
    title: "Un catalogue web compact pour la lecture et la reprise",
    detail: "Collections, titres et playback web.",
    image: PHOTO_FIELD,
  },
  {
    href: "/sport-live",
    label: "Sport live",
    title: "Un point d entree adapte aux chaines et evenements sportifs",
    detail: "Live et replays dans la meme surface publique.",
    image: PHOTO_WALL,
  },
] as const;

const BENEFITS = [
  "Une architecture simple: direct, replay, catalogue.",
  "Des appels a l action visibles sans surcharger la page.",
  "Une coherence de lecture entre home, viewer, replay et VOD.",
  "Un rendu plus produit que marketing, tout en restant editorial.",
] as const;

const FAQ = [
  {
    question: "Que peut-on regarder sur Oniix ?",
    answer:
      "Oniix permet de regarder des chaines TV en direct, des replays, des films et des series depuis le web et le mobile.",
  },
  {
    question: "Oniix fonctionne-t-il sur navigateur ?",
    answer:
      "Oui. Le portail public web donne acces au live, au replay et au catalogue depuis un navigateur desktop moderne.",
  },
  {
    question: "Peut-on suivre du sport en direct sur Oniix ?",
    answer:
      "Oui. La plateforme est structuree pour exposer des chaines live, des bouquets thematiques et des replays de programmes sportifs.",
  },
  {
    question: "Oniix propose-t-il aussi des films et des series ?",
    answer:
      "Oui. Le catalogue web couvre les films, les series, les saisons et les episodes publies par les ayants droit.",
  },
] as const;

export function PublicSeoSections() {
  return (
    <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-4 pb-16 sm:px-6 lg:px-8">
      <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Architecture publique
            </p>
            <h2 className="mt-3 font-[var(--font-we-display)] text-3xl font-semibold tracking-tight text-white">
              Un espace public pense comme un produit de lecture.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Oniix met le direct au premier plan, garde le replay accessible et relie le catalogue sans encombrer
              l interface.
            </p>
          </div>
          <Link
            href="/streaming"
            className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            Voir la plateforme
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PILLARS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-[26px] border border-white/10 bg-black/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TOPICS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-black p-5 transition hover:border-white/18"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-28 transition duration-700 group-hover:scale-[1.04]"
              style={{ backgroundImage: `url('${item.image}')` }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,12,0.28),rgba(2,6,12,0.94))]" />
            <div className="relative flex min-h-[15rem] flex-col justify-between">
              <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                {item.label}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.detail}</p>
                <div className="mt-4 inline-flex items-center text-sm text-slate-200">
                  Explorer
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Lisibilite</p>
          <h2 className="mt-3 font-[var(--font-we-display)] text-2xl font-semibold text-white">
            Pourquoi l experience reste legere
          </h2>
          <div className="mt-5 space-y-3">
            {BENEFITS.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <p className="text-sm leading-6 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">FAQ</p>
          <h2 className="mt-3 font-[var(--font-we-display)] text-2xl font-semibold text-white">
            Questions frequentes sur Oniix
          </h2>
          <div className="mt-5 space-y-3">
            {FAQ.map((item) => (
              <div key={item.question} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                <h3 className="text-base font-semibold text-white">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

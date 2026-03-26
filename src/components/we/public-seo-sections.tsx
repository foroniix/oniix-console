import Link from "next/link";

const PHOTO_WALL = "/branding/photography/rural-broadband-data-center.jpg";
const PHOTO_FIELD = "/branding/photography/fiber-field-work.jpg";
const PHOTO_TOWER = "/branding/photography/communications-tower.jpg";

const TOPICS = [
  {
    href: "/streaming",
    label: "Streaming web",
    title: "Une plateforme streaming pour la TV live, le replay et la VOD",
    image: PHOTO_WALL,
  },
  {
    href: "/tv-live",
    label: "TV en direct",
    title: "Des chaines TV et des directs disponibles depuis le navigateur",
    image: PHOTO_TOWER,
  },
  {
    href: "/films-series",
    label: "Films et series",
    title: "Un catalogue web pour les films, les series et les collections",
    image: PHOTO_FIELD,
  },
  {
    href: "/sport-live",
    label: "Sport live",
    title: "Un acces web pour suivre le sport en direct et les replays",
    image: PHOTO_WALL,
  },
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
      "Oui. Le catalogue web couvre les films, les series, les saisons et les episodes publies par les tenants.",
  },
] as const;

export function PublicSeoSections() {
  return (
    <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-8 px-4 pb-16 sm:px-6 lg:px-8">
      <div className="rounded-[34px] border border-white/10 bg-white/[0.025] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Explorer Oniix</p>
        <h2 className="mt-3 font-[var(--font-we-display)] text-3xl font-semibold tracking-tight text-white">
          Pages publiques ciblees pour le streaming web
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Oniix couvre la TV en direct, les replays, les films, les series et le sport live dans un meme portail public.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TOPICS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-black p-5 transition hover:border-white/18"
            >
              <div
                className="absolute inset-0 bg-cover bg-center opacity-28 transition duration-700 group-hover:scale-[1.04]"
                style={{ backgroundImage: `url('${item.image}')` }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.28),rgba(0,0,0,0.92))]" />
              <div className="relative flex min-h-[14rem] flex-col justify-end">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Couverture</p>
          <h2 className="mt-3 font-[var(--font-we-display)] text-2xl font-semibold text-white">
            Une plateforme orientee live, replay et catalogue.
          </h2>
          <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
            <div className="rounded-[20px] border border-white/10 bg-black/35 px-4 py-3">
              TV live et streaming desktop pour les chaines publiees par les tenants.
            </div>
            <div className="rounded-[20px] border border-white/10 bg-black/35 px-4 py-3">
              Replays web avec reprise de lecture, progression et navigation continue.
            </div>
            <div className="rounded-[20px] border border-white/10 bg-black/35 px-4 py-3">
              Catalogue web pour films, series, saisons et episodes.
            </div>
            <div className="rounded-[20px] border border-white/10 bg-black/35 px-4 py-3">
              Bouquets thematiques, categories et sport live quand les chaines sont disponibles.
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">FAQ</p>
          <h2 className="mt-3 font-[var(--font-we-display)] text-2xl font-semibold text-white">
            Questions frequentes sur Oniix
          </h2>
          <div className="mt-5 space-y-3">
            {FAQ.map((item) => (
              <div key={item.question} className="rounded-[20px] border border-white/10 bg-black/35 px-4 py-4">
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

import type { Metadata } from "next";
import Link from "next/link";

import { buildWebMetadata } from "@/app/we/metadata";
import { PublicTopicPage } from "@/components/we/public-topic-page";

const IMAGE = "/branding/photography/rural-broadband-data-center.jpg";

export const metadata: Metadata = buildWebMetadata({
  title: "Plateforme streaming web | Oniix",
  description:
    "Oniix est une plateforme streaming web pour regarder des chaines TV en direct, des replays, des films et des series.",
  path: "/streaming",
  image: IMAGE,
  keywords: [
    "streaming web",
    "plateforme streaming",
    "TV en direct",
    "replays",
    "films en streaming",
    "series en streaming",
    "Oniix",
  ],
});

export default function StreamingPage() {
  return (
    <PublicTopicPage
      eyebrow="Streaming web"
      title="Une plateforme streaming pour le live, le replay et la VOD."
      description="Oniix rassemble la TV en direct, les replays, les films et les series dans un portail web public unique."
      image={IMAGE}
      primaryHref="/"
      primaryLabel="Ouvrir Oniix"
      secondaryHref="/we/catalog"
      secondaryLabel="Voir le catalogue"
      highlights={[
        { label: "Live", value: "TV", detail: "Chaines et directs sur navigateur" },
        { label: "Replay", value: "Web", detail: "Rattrapage et reprise de lecture" },
        { label: "VOD", value: "Films", detail: "Films, series et collections" },
      ]}
      bullets={[
        "Acces direct aux chaines TV et aux directs depuis le web.",
        "Replays et progression synchronisee pour reprendre plus tard.",
        "Catalogue public pour films, series, saisons et episodes.",
        "Surface publique pensee pour les usages desktop et streaming continu.",
      ]}
    >
      <p className="text-sm leading-7 text-slate-300">
        La plateforme Oniix est structuree pour la diffusion live, le replay et le catalogue. Elle sert a la fois
        l&apos;entree publique de visionnage et les besoins de publication des tenants.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/tv-live"
          className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
        >
          TV en direct
        </Link>
        <Link
          href="/films-series"
          className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
        >
          Films et series
        </Link>
        <Link
          href="/sport-live"
          className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
        >
          Sport live
        </Link>
      </div>
    </PublicTopicPage>
  );
}

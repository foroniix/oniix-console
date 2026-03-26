import type { Metadata } from "next";
import Link from "next/link";

import { buildWebMetadata } from "@/app/we/metadata";
import { PublicTopicPage } from "@/components/we/public-topic-page";

const IMAGE = "/branding/photography/fiber-field-work.jpg";

export const metadata: Metadata = buildWebMetadata({
  title: "Films et series en streaming | Oniix",
  description:
    "Explorez les films, les series, les saisons et les episodes disponibles en streaming web sur Oniix.",
  path: "/films-series",
  image: IMAGE,
  keywords: [
    "films en streaming",
    "series en streaming",
    "catalogue web",
    "films et series",
    "vod web",
    "Oniix",
  ],
});

export default function FilmsSeriesPage() {
  return (
    <PublicTopicPage
      eyebrow="Films et series"
      title="Un catalogue web pour les films, les series et les collections."
      description="Oniix publie des films, des series, des saisons et des episodes dans un catalogue web pense pour la lecture et la reprise."
      image={IMAGE}
      primaryHref="/we/catalog"
      primaryLabel="Explorer le catalogue"
      secondaryHref="/streaming"
      secondaryLabel="Retour streaming"
      highlights={[
        { label: "Catalogue", value: "VOD", detail: "Films, series et collections" },
        { label: "Lecture", value: "Web", detail: "Acces navigateur et progression" },
        { label: "Bibliotheque", value: "Ma liste", detail: "Sauvegarde et reprise" },
      ]}
      bullets={[
        "Catalogue public pour films, series, saisons et episodes.",
        "Pages titre dediees avec lecture, progression et watchlist.",
        "Experience de reprise de lecture pour le web.",
        "Base adaptee a des partenaires catalogue et a la publication multi-tenant.",
      ]}
    >
      <p className="text-sm leading-7 text-slate-300">
        L&apos;espace catalogue Oniix couvre les films et les series avec une structure de publication propre pour le
        web, le mobile et les usages OTT.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/we/catalog"
          className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
        >
          Voir la VOD
        </Link>
        <Link
          href="/streaming"
          className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
        >
          Plateforme streaming
        </Link>
      </div>
    </PublicTopicPage>
  );
}

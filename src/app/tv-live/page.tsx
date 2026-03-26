import type { Metadata } from "next";
import Link from "next/link";

import { buildWebMetadata } from "@/app/we/metadata";
import { PublicTopicPage } from "@/components/we/public-topic-page";

const IMAGE = "/branding/photography/communications-tower.jpg";

export const metadata: Metadata = buildWebMetadata({
  title: "TV en direct et chaines live | Oniix",
  description:
    "Regardez des chaines TV et des directs web sur Oniix avec une experience de streaming live claire et accessible.",
  path: "/tv-live",
  image: IMAGE,
  keywords: ["TV en direct", "chaines TV", "live TV", "streaming live", "direct web", "Oniix"],
});

export default function TvLivePage() {
  return (
    <PublicTopicPage
      eyebrow="TV en direct"
      title="Des chaines live accessibles depuis le web."
      description="Le portail Oniix met en avant les chaines en direct, les categories editoriales et la navigation rapide vers le viewer live."
      image={IMAGE}
      primaryHref="/"
      primaryLabel="Voir les chaines live"
      secondaryHref="/#live-now"
      secondaryLabel="Acces direct"
      highlights={[
        { label: "Live", value: "24/7", detail: "Acces web aux directs publies" },
        { label: "Bouquets", value: "Multi", detail: "Categories et univers de chaines" },
        { label: "Viewer", value: "Desktop", detail: "Lecture live depuis navigateur" },
      ]}
      bullets={[
        "Viewer live dedie pour le streaming desktop.",
        "Navigation entre chaines, grille et replays lies.",
        "Entree publique sobre, rapide et lisible.",
        "Usage adapte aux chaines d actualites, sport, divertissement et business.",
      ]}
    >
      <p className="text-sm leading-7 text-slate-300">
        Oniix public met en avant la TV live avec une lecture continue, une structure par categories et un point
        d&apos;entree clair vers les directs actifs.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/sport-live"
          className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
        >
          Sport live
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

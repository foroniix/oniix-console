import type { Metadata } from "next";
import Link from "next/link";

import { buildWebMetadata } from "@/app/we/metadata";
import { PublicTopicPage } from "@/components/we/public-topic-page";

const IMAGE = "/branding/photography/communications-tower.jpg";

export const metadata: Metadata = buildWebMetadata({
  title: "Sport en direct en streaming | Oniix",
  description:
    "Retrouvez le sport en direct, les chaines live et les replays web publies sur Oniix.",
  path: "/sport-live",
  image: IMAGE,
  keywords: [
    "sport en direct",
    "streaming sport",
    "sport live",
    "chaines sport",
    "replay sport",
    "Oniix",
  ],
});

export default function SportLivePage() {
  return (
    <PublicTopicPage
      eyebrow="Sport live"
      title="Du sport en direct et des replays sur le web."
      description="Oniix expose des chaines live et des replays qui peuvent couvrir le sport, les evenements en direct et les contenus de rattrapage."
      image={IMAGE}
      primaryHref="/"
      primaryLabel="Voir les directs"
      secondaryHref="/#replays"
      secondaryLabel="Voir les replays"
      highlights={[
        { label: "Direct", value: "Live", detail: "Chaines et viewer web" },
        { label: "Replay", value: "Catch-up", detail: "Programmes et rattrapage" },
        { label: "Acces", value: "Desktop", detail: "Lecture sur navigateur" },
      ]}
      bullets={[
        "Bouquets live et categories editoriales sur le portail public.",
        "Viewer web adapte aux usages sport et actualisation continue.",
        "Replays lies aux chaines pour prolonger le visionnage.",
        "Surface compatible avec des chaines sportives et des evenements live.",
      ]}
    >
      <p className="text-sm leading-7 text-slate-300">
        Le sport live sur Oniix s&apos;appuie sur les chaines publiees par les tenants et sur les replays accessibles
        depuis le portail public web.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/tv-live"
          className="inline-flex h-11 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
        >
          TV live
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

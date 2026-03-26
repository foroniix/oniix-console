import type { Metadata } from "next";

import WebLiveHomeClient from "./we/we-home-client";
import { buildWebMetadata } from "./we/metadata";
import { PublicSeoSections } from "@/components/we/public-seo-sections";
import { WebViewerShell } from "@/components/we/web-viewer-shell";

export const metadata: Metadata = buildWebMetadata({
  title: "Oniix | Streaming web, TV en direct, replays, films et series",
  description:
    "Accedez au streaming web Oniix pour regarder les chaines TV, les replays, les films et les series depuis votre navigateur.",
  path: "/",
  image: "https://oniix.space/branding/photography/rural-broadband-data-center.jpg",
  keywords: [
    "Oniix",
    "streaming web",
    "TV en direct",
    "live TV",
    "replays",
    "films et series",
    "sport live",
    "plateforme streaming",
  ],
});

export default function HomePage() {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Oniix",
    url: "https://oniix.space",
    sameAs: ["https://oniix.space"],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Oniix",
    url: "https://oniix.space",
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Oniix Streaming",
    provider: {
      "@type": "Organization",
      name: "Oniix",
      url: "https://oniix.space",
    },
    serviceType: "Streaming platform",
    areaServed: ["Africa", "Europe"],
    audience: {
      "@type": "Audience",
      audienceType: "TV viewers and streaming audiences",
    },
    offers: [
      { "@type": "Offer", name: "TV en direct" },
      { "@type": "Offer", name: "Replays" },
      { "@type": "Offer", name: "Films et series" },
      { "@type": "Offer", name: "Sport live" },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Que peut-on regarder sur Oniix ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oniix permet de regarder des chaines TV en direct, des replays, des films et des series depuis le web et le mobile.",
        },
      },
      {
        "@type": "Question",
        name: "Oniix fonctionne-t-il sur navigateur ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Le portail public web donne acces au live, au replay et au catalogue depuis un navigateur desktop moderne.",
        },
      },
      {
        "@type": "Question",
        name: "Peut-on suivre du sport en direct sur Oniix ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. La plateforme est structuree pour exposer des chaines live, des bouquets thematiques et des replays de programmes sportifs.",
        },
      },
      {
        "@type": "Question",
        name: "Oniix propose-t-il aussi des films et des series ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Le catalogue web couvre les films, les series, les saisons et les episodes publies par les tenants.",
        },
      },
    ],
  };

  return (
    <WebViewerShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <WebLiveHomeClient />
      <PublicSeoSections />
    </WebViewerShell>
  );
}

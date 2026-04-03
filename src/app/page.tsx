import type { Metadata } from "next";

import WebLiveHomeClient from "./we/we-home-client";
import { buildWebMetadata } from "./we/metadata";
import { WebViewerShell } from "@/components/we/web-viewer-shell";

export const metadata: Metadata = buildWebMetadata({
  title: "Oniix | TV en direct, replays et VOD",
  description:
    "Regardez les chaines en direct, reprenez vos programmes et explorez le catalogue Oniix depuis le web.",
  path: "/",
  image: "https://oniix.space/branding/photography/rural-broadband-data-center.jpg",
  keywords: ["Oniix", "TV en direct", "replays", "films et series", "catalogue VOD"],
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
      <WebLiveHomeClient />
    </WebViewerShell>
  );
}

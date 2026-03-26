import type { Metadata } from "next";

import WebLiveHomeClient from "./we/we-home-client";
import { buildWebMetadata } from "./we/metadata";
import { WebViewerShell } from "@/components/we/web-viewer-shell";

export const metadata: Metadata = buildWebMetadata({
  title: "Oniix | TV en direct, replays, films et series",
  description:
    "Regardez les chaines TV, les replays, les films et les series Oniix depuis votre navigateur.",
  path: "/",
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
      <WebLiveHomeClient />
    </WebViewerShell>
  );
}

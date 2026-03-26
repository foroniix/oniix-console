import type { Metadata } from "next";

import WebLiveHomeClient from "./we-home-client";
import { buildWebMetadata } from "./metadata";

export const metadata: Metadata = buildWebMetadata({
  title: "TV web | Oniix",
  description: "Regardez les chaines TV et les directs Oniix depuis votre navigateur.",
  path: "/we",
});

export default function WebViewerEntryPage() {
  return <WebLiveHomeClient />;
}

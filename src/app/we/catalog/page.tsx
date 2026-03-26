import type { Metadata } from "next";

import WebCatalogHomeClient from "./web-catalog-home-client";
import { buildWebMetadata } from "../metadata";

export const metadata: Metadata = buildWebMetadata({
  title: "Catalogue streaming films et series | Oniix",
  description: "Films et series disponibles en streaming web sur Oniix.",
  path: "/we/catalog",
  image: "https://oniix.space/branding/photography/fiber-field-work.jpg",
  keywords: ["films en streaming", "series en streaming", "catalogue web", "VOD web", "Oniix"],
});

export default function WebCatalogPage() {
  return <WebCatalogHomeClient />;
}

import type { Metadata } from "next";

import WebCatalogHomeClient from "./web-catalog-home-client";
import { buildWebMetadata } from "../metadata";

export const metadata: Metadata = buildWebMetadata({
  title: "Catalogue web | Oniix",
  description: "Films et series disponibles en lecture web sur Oniix.",
  path: "/we/catalog",
});

export default function WebCatalogPage() {
  return <WebCatalogHomeClient />;
}

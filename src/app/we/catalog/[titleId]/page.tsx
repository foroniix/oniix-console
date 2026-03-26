import type { Metadata } from "next";

import WebCatalogTitleClient from "./web-catalog-title-client";
import { getWebCatalogTitleMetadata } from "../../metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ titleId: string }>;
}): Promise<Metadata> {
  const { titleId } = await params;
  return getWebCatalogTitleMetadata(titleId);
}

export default async function WebCatalogTitlePage({
  params,
}: {
  params: Promise<{ titleId: string }>;
}) {
  const { titleId } = await params;
  return <WebCatalogTitleClient titleId={titleId} />;
}

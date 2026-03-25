import WebCatalogTitleClient from "./web-catalog-title-client";

export default async function WebCatalogTitlePage({
  params,
}: {
  params: Promise<{ titleId: string }>;
}) {
  const { titleId } = await params;
  return <WebCatalogTitleClient titleId={titleId} />;
}

import ViewerClient from "./viewer-client";

export default async function WebViewerPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId } = await params;

  return <ViewerClient streamId={streamId} />;
}

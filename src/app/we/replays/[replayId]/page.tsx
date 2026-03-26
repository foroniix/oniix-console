import ReplayViewerClient from "./replay-viewer-client";

export default async function WebReplayPage({
  params,
}: {
  params: Promise<{ replayId: string }>;
}) {
  const { replayId } = await params;
  return <ReplayViewerClient replayId={replayId} />;
}

import type { Metadata } from "next";

import ReplayViewerClient from "./replay-viewer-client";
import { getWebReplayMetadata } from "../../metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ replayId: string }>;
}): Promise<Metadata> {
  const { replayId } = await params;
  return getWebReplayMetadata(replayId);
}

export default async function WebReplayPage({
  params,
}: {
  params: Promise<{ replayId: string }>;
}) {
  const { replayId } = await params;
  return <ReplayViewerClient replayId={replayId} />;
}

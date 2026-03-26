import type { Metadata } from "next";

import ViewerClient from "./viewer-client";
import { getWebLiveMetadata } from "../metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ streamId: string }>;
}): Promise<Metadata> {
  const { streamId } = await params;
  return getWebLiveMetadata(streamId);
}

export default async function WebViewerPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId } = await params;

  return <ViewerClient streamId={streamId} />;
}

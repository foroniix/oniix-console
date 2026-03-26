import type { ReactNode } from "react";

import { WebViewerShell } from "@/components/we/web-viewer-shell";

export default function WebViewerLayout({ children }: { children: ReactNode }) {
  return <WebViewerShell>{children}</WebViewerShell>;
}

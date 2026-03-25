import type { ReactNode } from "react";
import { Space_Grotesk, Work_Sans } from "next/font/google";

import { WebViewerNav } from "@/components/we/web-viewer-nav";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-we-display",
  weight: ["500", "600", "700"],
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  variable: "--font-we-body",
  weight: ["400", "500", "600", "700"],
});

export default function WebViewerLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${displayFont.variable} ${bodyFont.variable} min-h-dvh bg-[#030303] text-white`}>
      <WebViewerNav />
      {children}
    </div>
  );
}

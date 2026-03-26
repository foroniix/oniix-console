import type { ReactNode } from "react";
import { Space_Grotesk, Work_Sans } from "next/font/google";

import { WebViewerNav } from "@/components/we/web-viewer-nav";
import { WebViewerAuthProvider } from "@/components/we/web-viewer-auth";

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

export function WebViewerShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${displayFont.variable} ${bodyFont.variable} relative min-h-dvh overflow-x-hidden bg-black text-white`}
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,#070707_0%,#020202_38%,#000000_100%)]" />
        <div className="absolute left-[-14rem] top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-white/[0.04] blur-[180px]" />
        <div className="absolute right-[-10rem] top-[18rem] h-[28rem] w-[28rem] rounded-full bg-white/[0.03] blur-[170px]" />
        <div className="absolute bottom-[-12rem] left-[24%] h-[24rem] w-[24rem] rounded-full bg-white/[0.025] blur-[180px]" />
      </div>

      <WebViewerAuthProvider>
        <div className="relative z-10">
          <WebViewerNav />
          {children}
        </div>
      </WebViewerAuthProvider>
    </div>
  );
}

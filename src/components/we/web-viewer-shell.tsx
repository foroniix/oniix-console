import type { ReactNode } from "react";
import { Space_Grotesk, Work_Sans } from "next/font/google";

import { WebViewerFooter } from "@/components/we/web-viewer-footer";
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
      className={`${displayFont.variable} ${bodyFont.variable} relative min-h-dvh overflow-x-hidden bg-[#04070d] text-white [font-family:var(--font-we-body)]`}
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(92,183,255,0.22),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(255,255,255,0.08),transparent_16%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.1),transparent_24%),linear-gradient(180deg,#08101c_0%,#050912_42%,#030407_100%)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:96px_96px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.48),transparent_88%)]" />
        <div className="absolute left-[-12rem] top-[-9rem] h-[28rem] w-[28rem] rounded-full bg-sky-400/[0.12] blur-[170px]" />
        <div className="absolute right-[-10rem] top-[12rem] h-[24rem] w-[24rem] rounded-full bg-cyan-200/[0.08] blur-[150px]" />
        <div className="absolute bottom-[-10rem] left-[26%] h-[22rem] w-[22rem] rounded-full bg-blue-500/[0.08] blur-[170px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      <WebViewerAuthProvider>
        <div className="relative z-10 flex min-h-dvh flex-col">
          <WebViewerNav />
          <div className="flex-1">{children}</div>
          <WebViewerFooter />
        </div>
      </WebViewerAuthProvider>
    </div>
  );
}

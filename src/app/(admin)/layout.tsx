import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ConsoleFooter } from "@/components/legal/console-footer";
import { ConsoleIdentityProvider } from "@/components/layout/console-identity";
import { PageTitleSync } from "@/components/layout/page-title-sync";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export const metadata: Metadata = {
  title: {
    default: "Console Oniix",
    template: "%s | Console Oniix",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen overflow-hidden bg-[#04070d]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(122,183,255,0.14),transparent_24%),radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.05),transparent_16%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.08),transparent_24%),linear-gradient(180deg,#07101b_0%,#050912_44%,#04060a_100%)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:120px_120px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.45),transparent_90%)]" />
      </div>

      <ConsoleIdentityProvider>
        <PageTitleSync />
        <div className="relative mx-auto flex h-full w-full max-w-[1700px] gap-5 px-4 py-4 sm:px-5 sm:py-5 xl:px-6">
          <Sidebar />

          <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,21,0.96),rgba(5,8,14,0.98))] shadow-[0_34px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,183,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.03),transparent_22%)]" />
              <div className="console-ambient-line left-[8%] top-0 w-[36%]" />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/12" />
            <Topbar />
            <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5 xl:px-7">
              <div className="mx-auto w-full max-w-[1320px] space-y-6 lg:space-y-7">
                {children}
                <ConsoleFooter compact />
              </div>
            </main>
          </section>
        </div>
      </ConsoleIdentityProvider>
    </div>
  );
}

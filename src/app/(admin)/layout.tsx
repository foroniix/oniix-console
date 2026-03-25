import type { ReactNode } from "react";

import { ConsoleFooter } from "@/components/legal/console-footer";
import { ConsoleIdentityProvider } from "@/components/layout/console-identity";
import { PageTitleSync } from "@/components/layout/page-title-sync";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen overflow-hidden bg-[#000000]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.03),transparent_18%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_16%,transparent_84%,rgba(255,255,255,0.02))]" />
      </div>

      <ConsoleIdentityProvider>
        <PageTitleSync />
        <div className="relative mx-auto flex h-full w-full max-w-[1680px] gap-5 px-4 py-4 sm:px-5 sm:py-5 xl:px-6">
          <Sidebar />

          <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,rgba(0,0,0,0.96),rgba(6,6,6,0.98))] shadow-[0_34px_100px_rgba(0,0,0,0.52)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.04),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.03),transparent_22%)]" />
              <div className="console-ambient-line left-[8%] top-0 w-[36%]" />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/8" />
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

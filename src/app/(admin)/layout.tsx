import type { ReactNode } from "react";

import { ConsoleFooter } from "@/components/legal/console-footer";
import { ConsoleIdentityProvider } from "@/components/layout/console-identity";
import { PageTitleSync } from "@/components/layout/page-title-sync";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen overflow-hidden bg-[#08111c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(20,184,166,0.16),_transparent_24%),linear-gradient(180deg,#08111c_0%,#0d1724_100%)]" />
      <ConsoleIdentityProvider>
        <PageTitleSync />
        <div className="relative mx-auto flex h-full w-full max-w-[1520px] gap-4 p-4 sm:gap-5 sm:p-5 lg:gap-5 lg:p-5">
          <Sidebar />

          <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] shadow-[0_32px_90px_-56px_rgba(0,0,0,0.95)] backdrop-blur">
            <Topbar />
            <main className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(8,14,24,0.96),rgba(10,16,28,0.94))] px-3 py-3 sm:px-5 sm:py-5 lg:px-5 lg:py-5">
              <div className="mx-auto w-full max-w-[1220px] space-y-6">
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

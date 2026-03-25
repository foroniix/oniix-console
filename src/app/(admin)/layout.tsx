import type { ReactNode } from "react";

import { ConsoleFooter } from "@/components/legal/console-footer";
import { ConsoleIdentityProvider } from "@/components/layout/console-identity";
import { PageTitleSync } from "@/components/layout/page-title-sync";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen overflow-hidden bg-[var(--bg)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-12 top-0 h-[420px] w-[420px] rounded-full bg-[#1266b0]/22 blur-[120px]" />
        <div className="absolute right-[-8%] top-12 h-[360px] w-[360px] rounded-full bg-[#0f3964]/24 blur-[140px]" />
        <div className="absolute bottom-[-12%] left-[32%] h-[340px] w-[340px] rounded-full bg-[#9b5a2d]/16 blur-[140px]" />
        <div
          className="console-scene-image right-[-7%] top-[-3%] h-[480px] w-[480px]"
          style={{ backgroundImage: "url('/branding/editorial/oniix-control-room.svg')" }}
        />
        <div
          className="console-scene-image-delayed bottom-[-12%] left-[-8%] h-[420px] w-[420px]"
          style={{ backgroundImage: "url('/branding/editorial/oniix-signal-wall.svg')" }}
        />
      </div>

      <ConsoleIdentityProvider>
        <PageTitleSync />
        <div className="relative mx-auto flex h-full w-full max-w-[1680px] gap-5 px-4 py-4 sm:px-5 sm:py-5 xl:px-6">
          <Sidebar />

          <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,19,34,0.82),rgba(4,14,25,0.92))] shadow-[0_34px_100px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="console-scene-image-delayed bottom-[-10%] right-[-8%] h-[380px] w-[380px]"
                style={{ backgroundImage: "url('/branding/editorial/oniix-mobile-command.svg')" }}
              />
              <div className="console-ambient-line left-[8%] top-0 w-[36%]" />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
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

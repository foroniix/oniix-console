// src/app/(admin)/layout.tsx
import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0B0D] text-zinc-100">
      <div className="relative mx-auto flex h-screen w-full max-w-[1600px]">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />

          {/* seul le contenu scrolle */}
          <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="rounded-3xl border border-white/10 bg-zinc-950/30 shadow-2xl backdrop-blur-xl">
              <div className="p-4 sm:p-6 lg:p-8">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

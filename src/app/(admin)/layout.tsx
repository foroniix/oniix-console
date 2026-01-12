// src/app/(admin)/layout.tsx
import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

const SIDEBAR_W = 256;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0A0B0D] text-zinc-100">
      <div className="relative mx-auto h-dvh w-full max-w-[1600px] overflow-hidden">
        {/* Sidebar desktop (fixed dans le conteneur, pas de scroll) */}
        <aside
          className="hidden md:block fixed top-0 h-dvh shrink-0"
          style={{
            width: SIDEBAR_W,
            left: "max(0px, calc(50% - 800px))", // aligne avec le max-w[1600px] centré
          }}
        >
          <Sidebar />
        </aside>

        {/* Content (décalé à droite du sidebar, seul main scrolle) */}
        <div className="flex h-dvh min-w-0 flex-1 flex-col md:ml-[256px]">
          <Topbar />

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

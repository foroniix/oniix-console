import type { ReactNode } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1720px] gap-4 p-4 sm:gap-5 sm:p-5 lg:gap-6 lg:p-6">
        <Sidebar />

        <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[#262b38] bg-[#151821] shadow-[0_20px_80px_-70px_rgba(0,0,0,0.9)]">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
            <div className="mx-auto w-full max-w-[1360px]">{children}</div>
          </main>
        </section>
      </div>
    </div>
  );
}

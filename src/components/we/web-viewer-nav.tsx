"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/we", label: "TV" },
  { href: "/we/catalog", label: "Catalogue" },
];

export function WebViewerNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/we" className="shrink-0">
          <OniixLogo size="sm" subtitle="Web viewer" />
        </Link>

        <nav className="flex items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/we" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition",
                  active
                    ? "border-white/12 bg-white/[0.08] text-white"
                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

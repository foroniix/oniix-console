"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { cn } from "@/lib/utils";
import { useWebViewerAuth } from "@/components/we/web-viewer-auth";

const NAV_ITEMS = [
  { href: "/", label: "TV" },
  { href: "/we/catalog", label: "Catalogue" },
];

export function WebViewerNav() {
  const pathname = usePathname();
  const { user, isReady, watchlist, openAuthDialog, logout } = useWebViewerAuth();
  const displayName = user?.full_name?.trim() || user?.email?.split("@")[0] || "Profil";

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          <OniixLogo size="sm" subtitle={undefined} />
        </Link>

        <nav className="flex items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));

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

          {isReady ? (
            user ? (
              <>
                <Link
                  href="/we/catalog#watchlist"
                  className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
                >
                  Ma liste{watchlist.length > 0 ? ` (${watchlist.length})` : ""}
                </Link>
                <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white lg:inline-flex">
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-medium text-black transition hover:bg-slate-200"
                >
                  Deconnexion
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuthDialog("signup")}
                  className="hidden h-10 rounded-full border border-white/10 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white sm:inline-flex"
                >
                  Inscription
                </button>
                <button
                  type="button"
                  onClick={() => openAuthDialog("login")}
                  className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-medium text-black transition hover:bg-slate-200"
                >
                  Connexion
                </button>
              </>
            )
          ) : (
            <span className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chargement
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, PlayCircle, Tv2 } from "lucide-react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { useWebViewerAuth } from "@/components/we/web-viewer-auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "TV" },
  { href: "/we/catalog", label: "Catalogue" },
  { href: "/#replays", label: "Replays" },
];

export function WebViewerNav() {
  const pathname = usePathname();
  const { user, isReady, watchlist, openAuthDialog, logout } = useWebViewerAuth();
  const displayName = user?.full_name?.trim() || user?.email?.split("@")[0] || "Profil";

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-black/72 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[92rem] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="shrink-0">
            <OniixLogo size="sm" subtitle={undefined} />
          </Link>
          <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 lg:inline-flex">
            Streaming web
          </div>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/#replays"
                ? pathname === "/"
                : pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition",
                  active
                    ? "border-white/14 bg-white text-black"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/18 hover:bg-white/[0.07] hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden h-10 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white xl:inline-flex"
          >
            <Tv2 className="mr-2 h-4 w-4" />
            En direct
          </Link>

          {isReady ? (
            user ? (
              <>
                <Link
                  href="/we/catalog#watchlist"
                  className="hidden h-10 items-center rounded-full border border-white/10 px-4 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white lg:inline-flex"
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
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
                  className="hidden h-10 rounded-full border border-white/10 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white sm:inline-flex"
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
        </div>
      </div>
    </header>
  );
}

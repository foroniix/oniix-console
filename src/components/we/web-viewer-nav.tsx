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
    <header className="sticky top-0 z-30 px-4 pt-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,18,0.94),rgba(3,5,9,0.92))] px-3 py-2.5 shadow-[0_18px_60px_rgba(0,0,0,0.3)] backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0">
            <OniixLogo size="sm" subtitle={undefined} showMark={false} />
          </Link>
          <div className="hidden items-center gap-2 lg:flex">
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
              Web
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/25 p-1 md:flex">
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
                    "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition",
                    active
                      ? "border-white/14 bg-white text-slate-950 shadow-[0_8px_30px_rgba(255,255,255,0.16)]"
                      : "border-transparent bg-transparent text-slate-300 hover:border-white/12 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <Link
            href="/"
            className="hidden h-9 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white xl:inline-flex"
          >
            <Tv2 className="mr-2 h-4 w-4" />
            En direct
          </Link>

          {isReady ? (
            user ? (
              <>
                <Link
                  href="/we/catalog#watchlist"
                  className="hidden h-9 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white lg:inline-flex"
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
                  className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                >
                  Deconnexion
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuthDialog("signup")}
                  className="hidden h-9 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white sm:inline-flex"
                >
                  Inscription
                </button>
                <button
                  type="button"
                  onClick={() => openAuthDialog("login")}
                  className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                >
                  Connexion
                </button>
              </>
            )
          ) : (
            <span className="inline-flex h-9 items-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chargement
            </span>
          )}
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1 md:hidden">
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
                  "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition",
                  active
                    ? "border-white/14 bg-white text-slate-950 shadow-[0_8px_30px_rgba(255,255,255,0.16)]"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
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

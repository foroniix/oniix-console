"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Command,
  LifeBuoy,
  LogOut,
  Mail,
  Menu,
  Plus,
  RefreshCw,
  Search,
  UserCircle2,
} from "lucide-react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { SupportMailLink } from "@/components/support/support-mail-link";
import { useConsoleIdentity } from "@/components/layout/console-identity";
import NotificationCenter from "@/components/layout/notification-center";
import { SidebarNav } from "@/components/layout/Sidebar";
import { findRouteByQuery, resolveRoute } from "@/components/layout/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  buildInitials,
  CONSOLE_PRODUCT_DESCRIPTION,
  CONSOLE_PRODUCT_NAME,
  formatRoleLabel,
  SUPPORT_EMAIL,
} from "@/lib/console-branding";

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    avatarUrl,
    displayName,
    email,
    role,
    workspaceName,
    workspaces,
    switchingWorkspaceId,
    switchWorkspace,
  } = useConsoleIdentity();

  const route = React.useMemo(() => resolveRoute(pathname), [pathname]);
  const [query, setQuery] = React.useState("");

  const onSearchSubmit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const target = findRouteByQuery(query);
      if (!target) return;
      router.push(target.href);
      setQuery("");
    },
    [query, router]
  );

  const handleLogout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("logout_failed", error);
    }
  }, [router]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/88 backdrop-blur dark:border-white/10 dark:bg-[#0f1724]/88">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="border-slate-200 bg-white text-slate-700 lg:hidden dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[320px] border-white/10 bg-[#0b1622] p-0">
            <div className="border-b border-white/10 px-4 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Navigation</p>
              <div className="mt-3">
                <OniixLogo size="sm" subtitle="Pilotage OTT, analytics et opérations" />
              </div>
            </div>
            <SidebarNav />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-slate-500 sm:inline dark:text-slate-400">{CONSOLE_PRODUCT_NAME}</span>
            <ChevronRight className="hidden size-4 text-slate-400 sm:inline dark:text-slate-500" />
            <span className="truncate font-semibold text-slate-950 dark:text-white">{route.label}</span>
          </div>
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">{route.description}</p>
        </div>

        <form onSubmit={onSearchSubmit} className="relative ml-auto hidden w-full max-w-[460px] md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une page, une chaîne ou une action"
            className="h-10 rounded-2xl border-slate-200 bg-white pl-9 pr-16 text-sm text-slate-950 shadow-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500 dark:border-white/10 dark:bg-[#111827] dark:text-slate-400">
            <Command className="size-3" />K
          </span>
        </form>

        <div className="flex items-center gap-2">
          <Badge className="hidden border border-[#ccd6ff] bg-[#eef2ff] text-[#4056c8] lg:inline-flex dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300">
            {workspaceName}
          </Badge>
          <Badge className="hidden border border-slate-200 bg-white text-slate-700 md:inline-flex dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
            {formatRoleLabel(role)}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hidden rounded-2xl border-slate-200 bg-white text-slate-700 sm:inline-flex dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              >
                <Plus className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white"
            >
              <DropdownMenuItem asChild>
                <Link href="/channels">Nouvelle chaîne</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/streams">Nouveau direct</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/programming">Programmer une diffusion</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            asChild
            variant="outline"
            className="hidden rounded-2xl border-slate-200 bg-white text-slate-700 xl:inline-flex dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
          >
            <SupportMailLink>
              <LifeBuoy className="mr-2 size-4" />
              Support
            </SupportMailLink>
          </Button>

          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 rounded-xl px-2 sm:px-3">
                <Avatar className="size-8 border border-slate-200 dark:border-white/15">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback className="bg-[#eef2ff] text-[#4056c8] dark:bg-[#10203d] dark:text-[#7cb4ff]">
                    {buildInitials(displayName, email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-semibold text-slate-950 dark:text-white">{displayName}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">{workspaceName}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white"
            >
              <DropdownMenuLabel className="space-y-1 px-2 py-2">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {email ?? CONSOLE_PRODUCT_DESCRIPTION}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
              <DropdownMenuItem>
                <UserCircle2 className="mr-2 size-4" />
                Mon compte
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <SupportMailLink>
                  <Mail className="mr-2 size-4" />
                  <span>Contacter le support</span>
                  <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">{SUPPORT_EMAIL}</span>
                </SupportMailLink>
              </DropdownMenuItem>
              {workspaces.length > 1 ? (
                <>
                  <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
                  <DropdownMenuLabel className="px-2 py-2 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Espaces de travail
                  </DropdownMenuLabel>
                  {workspaces.map((workspace) => {
                    const isSwitching = switchingWorkspaceId === workspace.id;
                    return (
                      <DropdownMenuItem
                        key={workspace.id}
                        disabled={isSwitching}
                        className="flex items-center gap-2"
                        onClick={() => {
                          void switchWorkspace(workspace.id);
                        }}
                      >
                        {workspace.isActive ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : isSwitching ? (
                          <RefreshCw className="size-4 animate-spin text-sky-500" />
                        ) : (
                          <span className="size-4" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatRoleLabel(workspace.role)}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              ) : null}
              <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
              <DropdownMenuItem onClick={handleLogout} className="text-rose-500 focus:text-rose-500">
                <LogOut className="mr-2 size-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

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
import { useConsoleIdentity } from "@/components/layout/console-identity";
import NotificationCenter from "@/components/layout/notification-center";
import { SidebarNav } from "@/components/layout/Sidebar";
import { findRouteByQuery, resolveRoute } from "@/components/layout/navigation";
import { SupportMailLink } from "@/components/support/support-mail-link";
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
    <header className="sticky top-0 z-30 border-b border-[#223249] bg-[rgba(8,16,28,0.78)] backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-100 lg:hidden"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[320px] border-[#223249] bg-[#08101c] p-0 text-white">
            <div className="border-b border-[#223249] px-4 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Navigation</p>
              <div className="mt-3">
                <OniixLogo size="sm" subtitle="Pilotage OTT, analytics et opérations" />
              </div>
            </div>
            <SidebarNav />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-slate-500 sm:inline">{CONSOLE_PRODUCT_NAME}</span>
            <ChevronRight className="hidden size-4 text-slate-600 sm:inline" />
            <span className="truncate font-semibold text-white">{route.label}</span>
          </div>
          <p className="hidden text-xs text-slate-400 sm:block">{route.description}</p>
        </div>

        <form onSubmit={onSearchSubmit} className="relative ml-auto hidden w-full max-w-[460px] md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une page, une chaîne ou une action"
            className="h-10 rounded-2xl border-[#223249] bg-[rgba(255,255,255,0.04)] pl-9 pr-16 text-sm text-white placeholder:text-slate-500"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-xl border border-[#223249] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-[10px] text-slate-500">
            <Command className="size-3" />K
          </span>
        </form>

        <div className="flex items-center gap-2">
          <Badge className="hidden border border-sky-400/20 bg-sky-500/10 text-sky-200 lg:inline-flex">
            {workspaceName}
          </Badge>
          <Badge className="hidden border border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-200 md:inline-flex">
            {formatRoleLabel(role)}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hidden rounded-2xl border-[#223249] bg-[rgba(255,255,255,0.03)] text-white sm:inline-flex"
              >
                <Plus className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 border-[#223249] bg-[#0d1726] text-white"
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
            className="hidden rounded-2xl border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-100 xl:inline-flex"
          >
            <SupportMailLink>
              <LifeBuoy className="mr-2 size-4" />
              Support
            </SupportMailLink>
          </Button>

          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 rounded-xl px-2 text-slate-100 hover:bg-white/5 sm:px-3">
                <Avatar className="size-8 border border-[#223249]">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback className="bg-[#10203d] text-[#7cb4ff]">
                    {buildInitials(displayName, email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-semibold text-white">{displayName}</span>
                  <span className="block text-[11px] text-slate-400">{workspaceName}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 border-[#223249] bg-[#0d1726] text-white"
            >
              <DropdownMenuLabel className="space-y-1 px-2 py-2">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-400">
                  {email ?? CONSOLE_PRODUCT_DESCRIPTION}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#223249]" />
              <DropdownMenuItem>
                <UserCircle2 className="mr-2 size-4" />
                Mon compte
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <SupportMailLink>
                  <Mail className="mr-2 size-4" />
                  <span>Contacter le support</span>
                  <span className="ml-auto text-[11px] text-slate-500">{SUPPORT_EMAIL}</span>
                </SupportMailLink>
              </DropdownMenuItem>
              {workspaces.length > 1 ? (
                <>
                  <DropdownMenuSeparator className="bg-[#223249]" />
                  <DropdownMenuLabel className="px-2 py-2 text-xs uppercase tracking-[0.14em] text-slate-500">
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
                          <Check className="size-4 text-emerald-400" />
                        ) : isSwitching ? (
                          <RefreshCw className="size-4 animate-spin text-sky-400" />
                        ) : (
                          <span className="size-4" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                        <span className="text-[11px] text-slate-500">
                          {formatRoleLabel(workspace.role)}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              ) : null}
              <DropdownMenuSeparator className="bg-[#223249]" />
              <DropdownMenuItem onClick={handleLogout} className="text-rose-300 focus:text-rose-200">
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

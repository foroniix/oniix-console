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
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(8,12,18,0.72)] backdrop-blur-2xl">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[340px] p-0">
            <div className="border-b border-white/10 px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Navigation</p>
              <div className="mt-4">
                <OniixLogo size="sm" subtitle="Console d'exploitation OTT" />
              </div>
            </div>
            <SidebarNav />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="hidden sm:inline">{CONSOLE_PRODUCT_NAME}</span>
            <ChevronRight className="hidden size-3.5 sm:inline" />
            <span>{route.label}</span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-3">
            <h1 className="truncate text-lg font-semibold tracking-tight text-white">{route.label}</h1>
            <span className="hidden truncate text-sm text-slate-500 xl:inline">{route.description}</span>
          </div>
        </div>

        <form onSubmit={onSearchSubmit} className="relative ml-auto hidden w-full max-w-[480px] lg:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une page ou une action"
            className="h-11 pl-10 pr-16"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <Command className="size-3" />K
          </span>
        </form>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden xl:inline-flex">
            {workspaceName}
          </Badge>
          <Badge variant="outline" className="hidden md:inline-flex">
            {formatRoleLabel(role)}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="hidden sm:inline-flex">
                <Plus className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
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

          <Button asChild variant="outline" className="hidden xl:inline-flex">
            <SupportMailLink>
              <LifeBuoy className="size-4" />
              Support
            </SupportMailLink>
          </Button>

          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-11 gap-2 rounded-[18px] px-2 text-slate-100 hover:text-white sm:px-3">
                <Avatar className="size-9 border border-white/10">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback className="bg-[rgba(122,183,255,0.16)] text-[var(--brand-primary)]">
                    {buildInitials(displayName, email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-semibold text-white">{displayName}</span>
                  <span className="block text-[11px] text-slate-500">{workspaceName}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="space-y-1 normal-case tracking-normal text-left">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-400">{email ?? CONSOLE_PRODUCT_DESCRIPTION}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserCircle2 className="size-4" />
                Mon compte
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <SupportMailLink>
                  <Mail className="size-4" />
                  <span>Contacter le support</span>
                  <span className="ml-auto text-[11px] uppercase tracking-[0.12em] text-slate-500">{SUPPORT_EMAIL}</span>
                </SupportMailLink>
              </DropdownMenuItem>
              {workspaces.length > 1 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Espaces</DropdownMenuLabel>
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
                          <RefreshCw className="size-4 animate-spin text-[var(--brand-primary)]" />
                        ) : (
                          <span className="size-4" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                        <span className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                          {formatRoleLabel(workspace.role)}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                <LogOut className="size-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

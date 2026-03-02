"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Command,
  LogOut,
  Menu,
  Plus,
  Search,
  UserCircle2,
} from "lucide-react";

import { SidebarNav } from "@/components/layout/Sidebar";
import { findRouteByQuery, resolveRoute } from "@/components/layout/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type MeResponse =
  | {
      ok: true;
      user: {
        email?: string | null;
        full_name?: string | null;
        role?: string | null;
        avatar_url?: string | null;
        tenant_id?: string | null;
      };
    }
  | { ok: false; error?: string };

type TenantResponse =
  | {
      ok: true;
      tenant: {
        id: string;
        name: string;
      };
    }
  | { ok: false; error?: string };

const APP_ENV = (process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "production").toLowerCase();

function buildInitials(name?: string | null, email?: string | null) {
  const source = String(name || email || "CE").trim();
  if (!source) return "CE";
  const parts = source.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "C").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "E").toUpperCase();
  return `${a}${b}`;
}

function formatRoleLabel(value: string) {
  const role = value.trim().toLowerCase();
  if (["superadmin", "admin", "owner", "tenant_admin"].includes(role)) return "Admin";
  if (["editor", "editeur"].includes(role)) return "Editeur";
  if (["analyst", "analyste"].includes(role)) return "Analyste";
  return "Viewer";
}

function getEnvironmentMeta() {
  if (APP_ENV.includes("stag")) {
    return {
      label: "Staging",
      className: "border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]",
    };
  }
  return {
    label: "Prod",
    className: "border border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]",
  };
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();

  const route = React.useMemo(() => resolveRoute(pathname), [pathname]);
  const [query, setQuery] = React.useState("");
  const [name, setName] = React.useState("Admin Editeur");
  const [email, setEmail] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<string>("admin");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = React.useState("Workspace");
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [meRes, tenantRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/settings/tenant", { cache: "no-store" }).catch(() => null),
        ]);

        const meJson = (await meRes.json().catch(() => null)) as MeResponse | null;
        if (mounted && meRes.ok && meJson && "ok" in meJson && meJson.ok) {
          setName(meJson.user.full_name?.trim() || "Admin Editeur");
          setEmail(meJson.user.email?.trim() || null);
          setRole((meJson.user.role?.trim() || "admin").toLowerCase());
          setAvatarUrl(meJson.user.avatar_url?.trim() || null);
          setWorkspaceId(meJson.user.tenant_id?.trim() || null);
        }

        if (!tenantRes) return;
        const tenantJson = (await tenantRes.json().catch(() => null)) as TenantResponse | null;
        if (!mounted) return;
        if (tenantRes.ok && tenantJson && "ok" in tenantJson && tenantJson.ok) {
          setWorkspaceName(tenantJson.tenant.name || "Workspace");
          setWorkspaceId(tenantJson.tenant.id || null);
        }
      } catch {
        // ignore profile fetch errors
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  const environment = getEnvironmentMeta();

  return (
    <header className="sticky top-0 z-30 border-b border-[#262b38] bg-[#151821]/95 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-5 lg:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="border-[#262b38] bg-[#1b1f2a] lg:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[320px] border-[#262b38] bg-[#151821] p-0">
            <div className="border-b border-[#262b38] px-4 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b93a7]">Navigation</p>
              <p className="mt-1 text-sm font-semibold text-[#e6eaf2]">Console Editeur</p>
            </div>
            <SidebarNav />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-[#8b93a7] sm:inline">Console Editeur</span>
            <ChevronRight className="hidden size-4 text-[#8b93a7] sm:inline" />
            <span className="truncate font-semibold text-[#e6eaf2]">{route.label}</span>
          </div>
          <p className="hidden text-xs text-[#8b93a7] sm:block">{route.description}</p>
        </div>

        <form onSubmit={onSearchSubmit} className="relative ml-auto hidden w-full max-w-[460px] md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8b93a7]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher: chaines, direct, programmation, replays..."
            className="h-10 border-[#262b38] bg-[#1b1f2a] pl-9 pr-16 text-sm text-[#e6eaf2]"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-[#262b38] bg-[#151821] px-2 py-1 text-[10px] text-[#8b93a7]">
            <Command className="size-3" />K
          </span>
        </form>

        <div className="flex items-center gap-2">
          <Badge className="hidden border border-[#4c82fb]/30 bg-[#1c2a4a] text-[#4c82fb] lg:inline-flex">
            {workspaceName}
          </Badge>
          <Badge className="hidden border border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2] md:inline-flex">
            {formatRoleLabel(role)}
          </Badge>
          <Badge className={`hidden md:inline-flex ${environment.className}`}>{environment.label}</Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hidden border-[#262b38] bg-[#1b1f2a] sm:inline-flex"
              >
                <Plus className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-[#262b38] bg-[#151821] text-[#e6eaf2]">
              <DropdownMenuItem asChild>
                <Link href="/channels">Nouvelle chaine</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/streams">Nouveau direct</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/programming">Programmer une diffusion</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="icon" className="hidden border-[#262b38] bg-[#1b1f2a] sm:inline-flex">
            <Bell className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 rounded-xl px-2 sm:px-3">
                <Avatar className="size-8 border border-white/15">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                  <AvatarFallback className="bg-[#1c2a4a] text-[#4c82fb]">
                    {buildInitials(name, email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-semibold text-[#e6eaf2]">{name}</span>
                  <span className="block text-[11px] text-[#8b93a7]">
                    {workspaceName}
                    {workspaceId ? ` (${workspaceId.slice(0, 6)})` : ""}
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-[#262b38] bg-[#151821] text-[#e6eaf2]">
              <DropdownMenuItem className="text-[#e6eaf2]">
                <UserCircle2 className="mr-2 size-4" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#262b38]" />
              <DropdownMenuItem onClick={handleLogout} className="text-[#ef4444] focus:text-[#ef4444]">
                <LogOut className="mr-2 size-4" />
                Deconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

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
      };
    }
  | { ok: false; error?: string };

function buildInitials(name?: string | null, email?: string | null) {
  const source = String(name || email || "SA").trim();
  if (!source) return "SA";
  const parts = source.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "S").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "A").toUpperCase();
  return `${a}${b}`;
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();

  const route = React.useMemo(() => resolveRoute(pathname), [pathname]);
  const [query, setQuery] = React.useState("");
  const [name, setName] = React.useState("Super Admin");
  const [email, setEmail] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<string>("superadmin");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as MeResponse | null;
        if (!mounted || !res.ok || !json || !("ok" in json) || !json.ok) return;
        setName(json.user.full_name?.trim() || "Super Admin");
        setEmail(json.user.email?.trim() || null);
        setRole((json.user.role?.trim() || "superadmin").toLowerCase());
        setAvatarUrl(json.user.avatar_url?.trim() || null);
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

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f18]">
      <div className="flex items-center gap-3 px-3 py-3 sm:px-5 lg:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[320px] border-white/10 bg-[#090c14] p-0">
            <div className="border-b border-white/10 px-4 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Navigation</p>
              <p className="mt-1 text-sm font-semibold text-white">Oniix Superadmin</p>
            </div>
            <SidebarNav />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-zinc-500 sm:inline">Oniix</span>
            <ChevronRight className="hidden size-4 text-zinc-700 sm:inline" />
            <span className="truncate font-semibold text-white">{route.label}</span>
          </div>
          <p className="hidden text-xs text-zinc-500 sm:block">{route.description}</p>
        </div>

        <form onSubmit={onSearchSubmit} className="relative ml-auto hidden w-full max-w-[460px] md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Naviguer: tenants, streams, users, system..."
            className="h-10 border-white/10 bg-white/5 pl-9 pr-16 text-sm"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-400">
            <Command className="size-3" />K
          </span>
        </form>

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="hidden border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 md:inline-flex"
          >
            Platform live
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="hidden sm:inline-flex">
                <Plus className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href="/tenants">Nouveau tenant</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/users">Inviter un utilisateur</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/streams">Nouveau stream</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="icon" className="hidden sm:inline-flex">
            <Bell className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 rounded-xl px-2 sm:px-3">
                <Avatar className="size-8 border border-white/15">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {buildInitials(name, email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-semibold text-white">{name}</span>
                  <span className="block text-[11px] text-zinc-500">{role}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem className="text-zinc-200">
                <UserCircle2 className="mr-2 size-4" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-rose-300 focus:text-rose-200">
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


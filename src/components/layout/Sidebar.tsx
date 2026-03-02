"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Sparkles, Tv2 } from "lucide-react";

import { NAV_SECTIONS, isRouteActive } from "@/components/layout/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-4 pb-6 pt-5">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {section.title}
          </p>

          <div className="space-y-1.5">
            {section.items.map((item) => {
              const active = isRouteActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-200",
                    active
                      ? "border-primary/40 bg-primary/15 text-white shadow-[0_18px_40px_-28px_hsl(var(--primary)/0.9)]"
                      : "border-transparent bg-transparent text-zinc-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-9 items-center justify-center rounded-xl border transition-colors",
                      active
                        ? "border-primary/30 bg-primary/15 text-primary"
                        : "border-white/10 bg-white/5 text-zinc-500 group-hover:text-zinc-200"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-zinc-500">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const router = useRouter();
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
    <div className="border-t border-white/10 p-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-white/15">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="bg-primary/20 text-primary">
              {buildInitials(name, email)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="truncate text-xs text-zinc-400">{role} control plane</p>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="mt-3 w-full justify-start border border-transparent text-rose-300 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogOut className="mr-2 size-4" />
          Deconnexion
        </Button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden h-[calc(100vh-2rem)] w-[306px] shrink-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#0b0f18] lg:flex">
      <div className="border-b border-white/10 p-5">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-primary/35 bg-primary/15 shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.85)]">
            <Tv2 className="size-5 text-primary" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-white">Oniix Superadmin</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
              <Sparkles className="size-3.5 text-primary" />
              SaaS broadcast control plane
            </span>
          </span>
        </Link>
      </div>

      <SidebarNav />
      <SidebarFooter />
    </aside>
  );
}


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

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-4 pb-6 pt-5">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8b93a7]">
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
                    "group flex items-center gap-3 rounded-xl border-l-2 px-3 py-3 transition-all duration-200",
                    active
                      ? "border-l-[#4c82fb] border-y-[#4c82fb]/25 border-r-[#4c82fb]/25 bg-[rgba(76,130,251,0.08)] text-[#e6eaf2]"
                      : "border-l-transparent border-y-transparent border-r-transparent bg-transparent text-[#8b93a7] hover:border-y-[#262b38] hover:border-r-[#262b38] hover:bg-[#1b1f2a] hover:text-[#e6eaf2]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-9 items-center justify-center rounded-lg border transition-colors",
                      active
                        ? "border-[#4c82fb]/30 bg-[#1c2a4a] text-[#4c82fb]"
                        : "border-[#262b38] bg-[#1b1f2a] text-[#8b93a7] group-hover:text-[#e6eaf2]"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-[#8b93a7]">{item.description}</span>
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
  const [name, setName] = React.useState("Admin Editeur");
  const [email, setEmail] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<string>("admin");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as MeResponse | null;
        if (!mounted || !res.ok || !json || !("ok" in json) || !json.ok) return;
        setName(json.user.full_name?.trim() || "Admin Editeur");
        setEmail(json.user.email?.trim() || null);
        setRole((json.user.role?.trim() || "admin").toLowerCase());
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
    <div className="border-t border-[#262b38] p-4">
      <div className="rounded-2xl border border-[#262b38] bg-[#1b1f2a] p-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-[#262b38]">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="bg-[#1c2a4a] text-[#4c82fb]">
              {buildInitials(name, email)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#e6eaf2]">{name}</p>
            <p className="truncate text-xs text-[#8b93a7]">{formatRoleLabel(role)}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="mt-3 w-full justify-start border border-transparent text-[#ef4444] hover:border-[#ef4444]/30 hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
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
    <aside className="hidden h-[calc(100vh-2rem)] w-[306px] shrink-0 flex-col overflow-hidden rounded-[24px] border border-[#262b38] bg-[#151821] lg:flex">
      <div className="border-b border-[#262b38] p-5">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-[#4c82fb]/35 bg-[#1c2a4a] shadow-[0_18px_40px_-24px_rgba(76,130,251,0.45)]">
            <Tv2 className="size-5 text-[#4c82fb]" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-[#e6eaf2]">Console Editeur</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[#8b93a7]">
              <Sparkles className="size-3.5 text-[#4c82fb]" />
              Pilotage de diffusion OTT
            </span>
          </span>
        </Link>
      </div>

      <SidebarNav />
      <SidebarFooter />
    </aside>
  );
}

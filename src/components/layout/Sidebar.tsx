"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  Tv,
  Signal,
  Megaphone,
  Target,
  Banknote,
  Users,
  Settings,
  LogOut,
  Radio,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type Role = string;

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: Role[];
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/", label: "Vue d'ensemble", icon: LayoutDashboard },
      { href: "/activities", label: "Activités", icon: Activity },
    ],
  },
  {
    title: "Broadcast",
    items: [
      { href: "/channels", label: "Chaînes TV", icon: Tv },
      { href: "/streams", label: "Flux & Signaux", icon: Signal },
    ],
  },
  {
    title: "Monétisation",
    items: [
      {
        href: "/ads",
        label: "Publicités",
        icon: Megaphone,
        allowedRoles: ["owner", "admin", "tenant_admin", "superadmin"],
      },
      {
        href: "/ads/campaigns",
        label: "Campagnes",
        icon: Target,
        allowedRoles: ["owner", "admin", "tenant_admin", "superadmin"],
      },
      {
        href: "/revenue",
        label: "Revenus",
        icon: Banknote,
        allowedRoles: ["owner", "admin", "tenant_admin", "superadmin"],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/users",
        label: "Utilisateurs",
        icon: Users,
        allowedRoles: ["owner", "admin", "tenant_admin", "superadmin"],
      },
      {
        href: "/settings",
        label: "Configuration",
        icon: Settings,
        allowedRoles: ["member", "admin", "owner", "tenant_admin", "superadmin"],
      },
    ],
  },
];

type MeResponse =
  | {
      ok: true;
      user: {
        id: string;
        email?: string | null;
        role?: string | null;
        full_name?: string | null;
        avatar_url?: string | null;
      };
    }
  | { ok: false; error: string };

type TenantResponse =
  | { ok: true; tenant: { id: string; name: string } }
  | { ok: false; error?: string };

function initialsFromNameOrEmail(name?: string | null, email?: string | null) {
  const base = (name && name.trim().length ? name : email || "Utilisateur").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "U").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase();
  return (a + b).trim();
}

type SidebarProps = {
  inDrawer?: boolean;
  onNavigate?: () => void;
};

export default function Sidebar({ inDrawer = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = React.useState("");
  const [fullName, setFullName] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [userEmail, setUserEmail] = React.useState("");
  const [tenantName, setTenantName] = React.useState("");

  const currentRole = React.useMemo(() => (role || "member").toLowerCase(), [role]);
  const initials = React.useMemo(
    () => initialsFromNameOrEmail(fullName, userEmail),
    [fullName, userEmail]
  );

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const visibleSections = React.useMemo(() => {
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((item) => {
        if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
        return item.allowedRoles.map((r) => String(r).toLowerCase()).includes(currentRole);
      }),
    })).filter((s) => s.items.length > 0);
  }, [currentRole]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [meRes, tenantRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/settings/tenant", { cache: "no-store" }),
        ]);

        const meJson = (await meRes.json().catch(() => null)) as MeResponse | null;
        const tenantJson = (await tenantRes.json().catch(() => null)) as TenantResponse | null;

        if (!mounted) return;

        if (meRes.ok && meJson && "ok" in meJson && meJson.ok) {
          setUserEmail(meJson.user.email || "");
          setRole(meJson.user.role || "");
          setFullName(meJson.user.full_name ?? null);
          setAvatarUrl(meJson.user.avatar_url ?? null);
        }

        if (tenantRes.ok && tenantJson && "ok" in tenantJson && tenantJson.ok) {
          setTenantName(tenantJson.tenant?.name ?? "");
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      onNavigate?.();
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <aside
      className={cn(
        // ✅ Grid = footer garanti visible
        "grid h-dvh w-[240px] grid-rows-[auto,1fr,auto] bg-zinc-950 text-zinc-100",
        !inDrawer && "border-r border-white/5"
      )}
    >
      {/* HEADER (plus compact) */}
      <div className="h-12 px-3 flex items-center gap-3 border-b border-white/5">
        <div className="h-8 w-8 rounded-xl bg-indigo-600/90 ring-1 ring-white/10 flex items-center justify-center">
          <Radio className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="text-sm font-semibold truncate">ONIIX Partner</div>
          <div className="text-[10px] text-zinc-500 truncate">Control Center</div>
        </div>
      </div>

      {/* MENU (contraint, pas de scroll, ne pousse jamais le footer) */}
      <div className="min-h-0 overflow-hidden px-2 py-2">
        <div className="space-y-2">
          {visibleSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title ? (
                <div className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {section.title}
                </div>
              ) : null}

              <nav className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onNavigate?.()}
                      className={cn(
                        // ✅ moins haut, moins d’espace
                        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition",
                        active
                          ? "bg-white/10 text-white ring-1 ring-white/10"
                          : "text-zinc-300/85 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active ? "text-indigo-200" : "text-zinc-500")} />
                      <span className="truncate font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER (toujours visible) */}
      <div className="px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Separator className="bg-white/5 my-2" />

        <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-white/10">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={userEmail || "User"} /> : null}
              <AvatarFallback className="bg-zinc-900 text-zinc-200 text-[11px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate">{tenantName || "Organisation"}</div>
              <div className="text-[11px] text-zinc-500 truncate">{userEmail || "—"}</div>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="mt-2 h-8 w-full justify-start px-2 text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </div>
    </aside>
  );
}

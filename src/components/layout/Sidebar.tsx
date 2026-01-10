"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Activity,
  Banknote,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings,
  Signal,
  Tv,
  Users,
  Megaphone,
  Target,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

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
      { href: "/activities", label: "Activités", icon: Activity }
    ]
  },
  {
    title: "BROADCAST",
    items: [
      { href: "/channels", label: "Chaînes TV", icon: Tv },
      { href: "/streams", label: "Flux & Signaux", icon: Signal }
    ]
  },
  {
    title: "MONÉTISATION",
    items: [
      {
        href: "/ads",
        label: "Publicités",
        icon: Megaphone,
        allowedRoles: ["owner", "admin", "tenant_admin", "superadmin"]
      },
      {
        href: "/ads/campaigns",
        label: "Campagnes",
        icon: Target,
        allowedRoles: ["owner", "admin", "tenant_admin", "superadmin"]
      },
      {
        href: "/revenue",
        label: "Revenus",
        icon: Banknote,
        allowedRoles: ["owner", "admin", "tenant_admin", "superadmin"]
      }
    ]
  },
  {
    title: "ADMINISTRATION",
    items: [
      {
        href: "/users",
        label: "Utilisateurs",
        icon: Users,
        allowedRoles: ["owner", "admin", "tenant_admin", "superadmin"]
      },
      {
        href: "/settings",
        label: "Configuration",
        icon: Settings,
        allowedRoles: ["member", "admin", "owner", "tenant_admin", "superadmin"]
      }
    ]
  }
];

type MeResponse =
  | {
      ok: true;
      user: {
        id: string;
        email?: string | null;
        role?: string | null;
        tenant_id?: string | null;
        full_name?: string | null;
        avatar_url?: string | null;
      };
    }
  | { ok: false; error: string };

type TenantResponse =
  | { ok: true; tenant: { id: string; name: string } }
  | { ok: false; error?: string };

function shortId(id: string, start = 6, end = 4) {
  if (!id) return "—";
  if (id.length <= start + end + 1) return id;
  return `${id.slice(0, start)}…${id.slice(-end)}`;
}

function initialsFromNameOrEmail(name?: string | null, email?: string | null) {
  const base = (name && name.trim().length ? name : email || "Utilisateur").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "U").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase();
  return (a + b).trim();
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [tenantName, setTenantName] = useState<string>("");
  const [meLoaded, setMeLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const currentRole = useMemo(() => (role || "member").toLowerCase(), [role]);

  // (optionnel) Toujours utile pour l'alt du badge / avatar
  const displayName = useMemo(() => {
    if (fullName && fullName.trim().length) return fullName.trim();
    if (userEmail) return userEmail;
    return meLoaded ? "Utilisateur" : "Chargement…";
  }, [fullName, userEmail, meLoaded]);

  const initials = useMemo(
    () => initialsFromNameOrEmail(fullName, userEmail),
    [fullName, userEmail]
  );

  const loadMe = async () => {
    setRefreshing(true);
    try {
      const [meRes, tenantRes] = await Promise.all([
        fetch("/api/auth/me", { method: "GET", cache: "no-store" }),
        fetch("/api/settings/tenant", { method: "GET", cache: "no-store" })
      ]);

      const meJson = (await meRes.json().catch(() => null)) as MeResponse | null;
      const tenantJson = (await tenantRes.json().catch(() => null)) as TenantResponse | null;

      if (meRes.ok && meJson && "ok" in meJson && meJson.ok) {
        setUserId(meJson.user.id || "");
        setUserEmail(meJson.user.email || "");
        setRole(meJson.user.role || "");
        setFullName(meJson.user.full_name ?? null);
        setAvatarUrl(meJson.user.avatar_url ?? null);
      } else {
        setUserId("");
        setUserEmail("");
        setRole("");
        setFullName(null);
        setAvatarUrl(null);
      }

      if (tenantRes.ok && tenantJson && "ok" in tenantJson && tenantJson.ok) {
        setTenantName(tenantJson.tenant?.name ?? "");
      } else {
        setTenantName("");
      }
    } catch {
      setUserId("");
      setUserEmail("");
      setRole("");
      setFullName(null);
      setAvatarUrl(null);
      setTenantName("");
    } finally {
      setMeLoaded(true);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadMe();
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Erreur déconnexion", error);
    }
  };

  const copyUserId = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
    } catch {}
  };

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-white/5 bg-zinc-950 text-zinc-100 font-sans">
      {/* HEADER */}
      <div className="h-16 shrink-0 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 shadow-[0_0_0_1px_rgba(99,102,241,0.25),0_12px_22px_rgba(79,70,229,0.20)] flex items-center justify-center">
            <Radio className="h-5 w-5 text-white" />
          </div>

          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-white">
              ONIIX <span className="text-indigo-300">PARTNER</span>
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Control Center
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={loadMe}
          className="h-9 w-9 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
          title="Rafraîchir"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {/* NAV (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-5 space-y-6">
        {SECTIONS.map((section, idx) => {
          const visibleItems = section.items.filter((item) => {
            if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
            return item.allowedRoles
              .map((r) => String(r).toLowerCase())
              .includes(currentRole);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx}>
              {section.title ? (
                <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  {section.title}
                </div>
              ) : null}

              <nav className="space-y-1">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-indigo-500/10 text-indigo-200"
                          : "text-zinc-300/80 hover:text-zinc-100 hover:bg-white/5"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full transition-opacity",
                          active ? "bg-indigo-400 opacity-100" : "opacity-0"
                        )}
                      />

                      <item.icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          active
                            ? "text-indigo-300"
                            : "text-zinc-500 group-hover:text-zinc-300"
                        )}
                      />

                      <span className="truncate font-medium">{item.label}</span>

                      <ChevronRight
                        className={cn(
                          "ml-auto h-4 w-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity",
                          active && "text-indigo-300 opacity-100"
                        )}
                      />
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="shrink-0 border-t border-white/5 bg-zinc-950/70 backdrop-blur-xl p-4 space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10 border border-white/10">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-zinc-900 text-zinc-200 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
            </div>

            <div className="min-w-0 flex-1">
              {/* LIGNE 1: Nom du tenant */}
              <div className="text-sm font-semibold text-white truncate">
                {tenantName || "Organisation —"}
              </div>

              {/* LIGNE 2: Email */}
              <div className="text-[11px] text-zinc-500 truncate">
                {userEmail || "—"}
              </div>

              <button
                type="button"
                onClick={copyUserId}
                className={cn(
                  "mt-1 inline-flex items-center gap-2 text-[10px] font-mono text-zinc-500 hover:text-zinc-200 transition-colors",
                  userId ? "cursor-pointer" : "cursor-default"
                )}
                title={userId ? "Cliquer pour copier l'ID" : ""}
              >
                <span className="text-zinc-600">ID</span>
                <span className="rounded-md border border-white/10 bg-zinc-950/30 px-2 py-0.5 text-zinc-200">
                  {shortId(userId)}
                </span>
              </button>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </aside>
  );
}

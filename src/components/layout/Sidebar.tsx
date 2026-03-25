"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, LogOut, Mail, ShieldCheck } from "lucide-react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { useConsoleIdentity } from "@/components/layout/console-identity";
import { NAV_SECTIONS, isRouteActive } from "@/components/layout/navigation";
import { SupportMailLink } from "@/components/support/support-mail-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { buildInitials, formatRoleLabel, SUPPORT_EMAIL } from "@/lib/console-branding";
import { cn } from "@/lib/utils";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 pb-6 pt-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-3">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {section.title}
          </p>

          <div className="space-y-2">
            {section.items.map((item) => {
              const active = isRouteActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-[22px] border px-3.5 py-3 transition-all duration-200",
                    active
                      ? "border-white/12 bg-[linear-gradient(180deg,rgba(20,20,20,0.96),rgba(8,8,8,0.96))] text-white shadow-[0_18px_34px_rgba(0,0,0,0.34)]"
                      : "border-transparent text-slate-400 hover:border-white/8 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-11 items-center justify-center rounded-[18px] border transition-colors",
                      active
                        ? "border-white/12 bg-white/[0.06] text-white"
                        : "border-white/8 bg-white/[0.03] text-slate-400 group-hover:border-white/12 group-hover:text-white"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.description}</span>
                  </span>

                  {active ? <span className="size-2 rounded-full bg-white" /> : null}
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
  const { avatarUrl, displayName, email, role, workspaceName } = useConsoleIdentity();

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
      <div className="console-panel-muted p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-11 border border-white/10">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="bg-white/[0.08] text-white">{buildInitials(displayName, email)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-slate-400">
              {workspaceName} - {formatRoleLabel(role)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <ShieldCheck className="size-3.5 text-white" />
            Support
          </div>
          <SupportMailLink className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white transition hover:text-white/80">
            <Mail className="size-4 text-white" />
            {SUPPORT_EMAIL}
            <ArrowUpRight className="size-4" />
          </SupportMailLink>
          <p className="mt-2 text-xs leading-5 text-slate-400">Incidents, accès, onboarding et besoins opérationnels.</p>
        </div>

        <Button variant="outline" onClick={handleLogout} className="mt-4 w-full justify-start text-slate-200 hover:text-white">
          <LogOut className="size-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="relative hidden h-full w-[316px] shrink-0 flex-col overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(4,4,4,0.98),rgba(0,0,0,0.99))] shadow-[0_28px_72px_rgba(0,0,0,0.42)] lg:flex">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.04),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.02),transparent_20%)]" />
      </div>
      <div className="relative border-b border-white/10 p-5">
        <Link href="/dashboard" className="block">
          <span className="console-chip">Control room</span>
          <div className="mt-4">
            <OniixLogo size="md" subtitle="Opérations, programmation et revenus" />
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
            Poste de pilotage Oniix pour la diffusion, le catalogue et l&apos;exploitation.
          </p>
        </Link>
      </div>

      <SidebarNav />
      <SidebarFooter />
    </aside>
  );
}

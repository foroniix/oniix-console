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
                    "group relative flex items-center gap-3 rounded-[22px] border px-3.5 py-3.5 transition-all duration-200",
                    active
                      ? "border-[#5b8fd1]/40 bg-[linear-gradient(180deg,rgba(90,143,209,0.18),rgba(43,67,99,0.18))] text-white shadow-[0_18px_34px_rgba(12,18,28,0.26)]"
                      : "border-transparent text-slate-400 hover:border-white/8 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-11 items-center justify-center rounded-[18px] border transition-colors",
                      active
                        ? "border-[#77a8e0]/28 bg-[rgba(122,183,255,0.12)] text-[#9fd0ff]"
                        : "border-white/8 bg-white/[0.03] text-slate-400 group-hover:border-white/12 group-hover:text-white"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{item.description}</span>
                  </span>

                  {active ? <span className="size-2 rounded-full bg-[var(--brand-primary)]" /> : null}
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
            <AvatarFallback className="bg-[rgba(122,183,255,0.16)] text-[var(--brand-primary)]">
              {buildInitials(displayName, email)}
            </AvatarFallback>
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
            <ShieldCheck className="size-3.5 text-[var(--brand-primary)]" />
            Support
          </div>
          <SupportMailLink className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white transition hover:text-[var(--brand-primary)]">
            <Mail className="size-4 text-[var(--brand-primary)]" />
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
    <aside className="hidden h-full w-[316px] shrink-0 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,24,0.94),rgba(12,20,30,0.9))] shadow-[0_28px_72px_rgba(0,0,0,0.3)] lg:flex">
      <div className="border-b border-white/10 p-5">
        <Link href="/dashboard" className="block">
          <span className="console-chip">Control room</span>
          <div className="mt-4">
            <OniixLogo size="md" subtitle="Opérations, programmation et revenus" />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
            Un seul poste pour piloter les chaînes, les directs, les audiences et les accès.
          </p>
        </Link>
      </div>

      <SidebarNav />
      <SidebarFooter />
    </aside>
  );
}

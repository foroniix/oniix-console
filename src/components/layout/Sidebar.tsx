"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Mail } from "lucide-react";

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
    <nav className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-4 pb-6 pt-5">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
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
                      ? "border-[#3b5fa6] bg-[rgba(37,99,235,0.16)] text-white shadow-[0_12px_30px_-24px_rgba(64,86,200,0.52)]"
                      : "border-transparent bg-transparent text-slate-400 hover:border-[#223249] hover:bg-[rgba(255,255,255,0.04)] hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-10 items-center justify-center rounded-2xl border transition-colors",
                      active
                        ? "border-[#3b5fa6] bg-[#10203d] text-[#7cb4ff]"
                        : "border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-400 group-hover:border-[#314864] group-hover:text-white"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-slate-500">{item.description}</span>
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
    <div className="border-t border-[#223249] p-4">
      <div className="rounded-[24px] border border-[#223249] bg-[rgba(12,19,31,0.9)] p-3 shadow-[0_18px_38px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-[#223249]">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="bg-[#10203d] text-[#7cb4ff]">
              {buildInitials(displayName, email)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-slate-400">
              {workspaceName} · {formatRoleLabel(role)}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-[#223249] bg-[rgba(16,26,42,0.92)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Support
          </p>
          <SupportMailLink className="mt-2 flex items-center gap-2 text-sm font-medium text-white transition hover:text-[#7cb4ff]">
            <Mail className="size-4 text-[#7cb4ff]" />
            {SUPPORT_EMAIL}
          </SupportMailLink>
          <p className="mt-1 text-[11px] text-slate-400">
            Incident, accès, onboarding éditeur et assistance opérationnelle.
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="mt-3 w-full justify-start border border-transparent text-rose-300 hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogOut className="mr-2 size-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden h-[calc(100vh-2rem)] w-[292px] shrink-0 flex-col overflow-hidden rounded-[28px] border border-[#223249] bg-[linear-gradient(180deg,rgba(8,16,28,0.96),rgba(12,22,36,0.94))] shadow-[0_24px_60px_rgba(0,0,0,0.3)] lg:flex">
      <div className="border-b border-[#223249] p-5">
        <Link href="/dashboard" className="group">
          <OniixLogo size="md" subtitle="Console de pilotage" />
        </Link>
      </div>

      <SidebarNav />
      <SidebarFooter />
    </aside>
  );
}

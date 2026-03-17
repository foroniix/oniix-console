"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Mail } from "lucide-react";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { useConsoleIdentity } from "@/components/layout/console-identity";
import { NAV_SECTIONS, isRouteActive } from "@/components/layout/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { buildInitials, formatRoleLabel, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/console-branding";
import { cn } from "@/lib/utils";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-4 pb-6 pt-5">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
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
                      ? "border-sky-200 bg-sky-50 text-slate-950 shadow-[0_12px_30px_-24px_rgba(37,99,235,0.35)] dark:border-[#60a5fa]/30 dark:bg-[rgba(37,99,235,0.14)] dark:text-white dark:shadow-[0_12px_30px_-24px_rgba(37,99,235,0.85)]"
                      : "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-white/[0.05] dark:hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-10 items-center justify-center rounded-2xl border transition-colors",
                      active
                        ? "border-sky-200 bg-white text-sky-600 dark:border-[#60a5fa]/30 dark:bg-[#10203d] dark:text-[#7cb4ff]"
                        : "border-slate-200 bg-white text-slate-400 group-hover:border-slate-300 group-hover:text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:group-hover:text-white"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-slate-400">{item.description}</span>
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
    <div className="border-t border-slate-200 p-4 dark:border-white/10">
      <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-slate-200 dark:border-white/10">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="bg-sky-50 text-sky-700 dark:bg-[#10203d] dark:text-[#7cb4ff]">
              {buildInitials(displayName, email)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{displayName}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {workspaceName} · {formatRoleLabel(role)}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#0f1724]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Support
          </p>
          <a
            href={SUPPORT_MAILTO}
            className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-950 transition hover:text-sky-700 dark:text-white dark:hover:text-[#7cb4ff]"
          >
            <Mail className="size-4 text-sky-600 dark:text-[#7cb4ff]" />
            {SUPPORT_EMAIL}
          </a>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Incident, accès, onboarding éditeur et assistance opérationnelle.
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="mt-3 w-full justify-start border border-transparent text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:border-rose-400/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
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
    <aside className="hidden h-[calc(100vh-2rem)] w-[292px] shrink-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_24px_60px_rgba(15,23,42,0.08)] lg:flex dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(8,16,28,0.96),rgba(12,22,36,0.94))] dark:shadow-none">
      <div className="border-b border-slate-200 p-5 dark:border-white/10">
        <Link href="/dashboard" className="group">
          <OniixLogo size="md" subtitle="Console de pilotage" />
        </Link>
      </div>

      <SidebarNav />
      <SidebarFooter />
    </aside>
  );
}

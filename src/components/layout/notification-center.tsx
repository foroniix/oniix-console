"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  Info,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SupportMailLink } from "@/components/support/support-mail-link";

type NotificationSeverity = "info" | "success" | "warning" | "critical";

type NotificationItem = {
  id: string;
  kind: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionLabel: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

function formatRelativeTime(value: string) {
  const then = Date.parse(value);
  if (!Number.isFinite(then)) return "--";

  const diffSec = Math.round((then - Date.now()) / 1000);
  const absSec = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

  if (absSec < 60) return rtf.format(diffSec, "second");
  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}

function getSeverityMeta(severity: NotificationSeverity) {
  switch (severity) {
    case "success":
      return {
        icon: CircleCheck,
        badgeClassName: "border-emerald-500/20 bg-emerald-500/12 text-emerald-200",
        label: "Succes",
      };
    case "warning":
      return {
        icon: CircleAlert,
        badgeClassName: "border-amber-500/20 bg-amber-500/12 text-amber-200",
        label: "Attention",
      };
    case "critical":
      return {
        icon: BellRing,
        badgeClassName: "border-rose-500/20 bg-rose-500/12 text-rose-200",
        label: "Critique",
      };
    default:
      return {
        icon: Info,
        badgeClassName: "border-sky-500/20 bg-sky-500/12 text-sky-200",
        label: "Info",
      };
  }
}

function isExternalUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:");
}

export default function NotificationCenter() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const loadNotifications = React.useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; unreadCount: number; notifications: NotificationItem[] }
        | { ok?: false }
        | null;

      if (!res.ok || !json || !("ok" in json) || !json.ok) return;
      setNotifications(json.notifications);
      setUnreadCount(json.unreadCount);
    } catch {
      // ignore notification poll failures
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void loadNotifications(false);
    const timer = window.setInterval(() => {
      void loadNotifications(true);
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  React.useEffect(() => {
    if (!open) return;
    void loadNotifications(true);
  }, [loadNotifications, open]);

  const markOne = React.useCallback(
    async (id: string) => {
      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));

      try {
        await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });
      } catch {
        void loadNotifications(true);
      }
    },
    [loadNotifications]
  );

  const markAllRead = React.useCallback(async () => {
    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch {
      void loadNotifications(true);
    }
  }, [loadNotifications]);

  const unreadBadge = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative hidden sm:inline-flex">
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unreadBadge}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full p-0 sm:max-w-md">
        <SheetHeader className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>
                {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : "Aucune notification non lue"}
              </SheetDescription>
            </div>

            {unreadCount > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => void markAllRead()}>
                <CheckCheck className="size-4" />
                Tout lire
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-400">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Chargement des notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm text-slate-400">
              <p className="font-medium text-white">Aucune notification pour le moment.</p>
              <p className="mt-2">
                Les incidents, validations et actions prioritaires remonteront ici.
              </p>
              <SupportMailLink className="mt-4 inline-flex text-sm font-medium text-[var(--brand-primary)] hover:text-white">
                Contacter le support
              </SupportMailLink>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => {
                const meta = getSeverityMeta(item.severity);
                const Icon = meta.icon;

                return (
                  <div
                    key={item.id}
                    className={`rounded-[24px] border px-4 py-4 transition ${
                      item.isRead
                        ? "border-white/8 bg-white/[0.03]"
                        : "border-[#7ab7ff]/18 bg-[rgba(122,183,255,0.08)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 inline-flex size-10 items-center justify-center rounded-[16px] ${meta.badgeClassName}`}>
                        <Icon className="size-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          {!item.isRead ? <Badge>Nouveau</Badge> : null}
                          <Badge className={meta.badgeClassName}>{meta.label}</Badge>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>{formatRelativeTime(item.createdAt)}</span>
                          {refreshing ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="size-3 animate-spin" />
                              Sync
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {!item.isRead ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => void markOne(item.id)}>
                              Marquer comme lue
                            </Button>
                          ) : null}

                          {item.actionUrl ? (
                            isExternalUrl(item.actionUrl) ? (
                              <Button asChild variant="ghost" size="sm" className="text-[var(--brand-primary)] hover:text-white">
                                <a href={item.actionUrl} onClick={() => void markOne(item.id)}>
                                  {item.actionLabel ?? "Ouvrir"}
                                  <ExternalLink className="size-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button asChild variant="ghost" size="sm" className="text-[var(--brand-primary)] hover:text-white">
                                <Link
                                  href={item.actionUrl}
                                  onClick={() => {
                                    void markOne(item.id);
                                    setOpen(false);
                                  }}
                                >
                                  {item.actionLabel ?? "Ouvrir"}
                                  <ExternalLink className="size-4" />
                                </Link>
                              </Button>
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator className="bg-white/8" />

        <div className="px-5 py-4 text-xs text-slate-500">
          <p className="font-medium text-white">Besoin d&apos;aide ?</p>
          <p className="mt-1">Le support Oniix reste disponible pour les incidents, acces et demandes d&apos;onboarding.</p>
          <SupportMailLink className="mt-3 inline-flex text-sm font-medium text-[var(--brand-primary)] hover:text-white">
            support@oniix.space
          </SupportMailLink>
        </div>
      </SheetContent>
    </Sheet>
  );
}

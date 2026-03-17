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
import { SUPPORT_MAILTO } from "@/lib/console-branding";

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
        badgeClassName: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
        label: "Succes",
      };
    case "warning":
      return {
        icon: CircleAlert,
        badgeClassName: "border-amber-500/25 bg-amber-500/10 text-amber-300",
        label: "Attention",
      };
    case "critical":
      return {
        icon: BellRing,
        badgeClassName: "border-rose-500/25 bg-rose-500/10 text-rose-300",
        label: "Critique",
      };
    default:
      return {
        icon: Info,
        badgeClassName: "border-sky-500/25 bg-sky-500/10 text-sky-300",
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
        <Button variant="outline" size="icon" className="relative hidden border-[#262b38] bg-[#1b1f2a] sm:inline-flex">
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unreadBadge}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full border-l border-[#262b38] bg-[#151821] p-0 text-[#e6eaf2] sm:max-w-md">
        <SheetHeader className="border-b border-[#262b38] px-5 py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <SheetTitle className="text-base text-[#e6eaf2]">Notifications</SheetTitle>
              <SheetDescription className="text-[#8b93a7]">
                {unreadCount > 0
                  ? `${unreadCount} notification(s) non lue(s)`
                  : "Aucune notification non lue"}
              </SheetDescription>
            </div>

            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void markAllRead()}
                className="text-[#8b93a7] hover:text-[#e6eaf2]"
              >
                <CheckCheck className="mr-2 size-4" />
                Tout lire
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-[#8b93a7]">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Chargement des notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#262b38] bg-[#1b1f2a] p-5 text-sm text-[#8b93a7]">
              <p className="font-medium text-[#e6eaf2]">Aucune notification pour le moment.</p>
              <p className="mt-2">
                La plateforme vous remontera ici les incidents, les actions requises et les messages operationnels.
              </p>
              <a href={SUPPORT_MAILTO} className="mt-4 inline-flex text-sm font-medium text-[#4c82fb] hover:underline">
                Contacter le support
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => {
                const meta = getSeverityMeta(item.severity);
                const Icon = meta.icon;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border px-4 py-4 transition ${
                      item.isRead
                        ? "border-[#262b38] bg-[#121721]"
                        : "border-[#4c82fb]/25 bg-[#1a2130]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 inline-flex size-9 items-center justify-center rounded-xl ${meta.badgeClassName}`}>
                        <Icon className="size-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#e6eaf2]">{item.title}</p>
                          {!item.isRead ? (
                            <Badge className="border border-[#4c82fb]/25 bg-[#4c82fb]/10 text-[#9cbcff]">
                              Nouveau
                            </Badge>
                          ) : null}
                          <Badge className={meta.badgeClassName}>{meta.label}</Badge>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-[#b8c0d4]">{item.body}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#8b93a7]">
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
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void markOne(item.id)}
                              className="border-[#262b38] bg-[#0f141d] text-[#e6eaf2]"
                            >
                              Marquer comme lue
                            </Button>
                          ) : null}

                          {item.actionUrl ? (
                            isExternalUrl(item.actionUrl) ? (
                              <Button asChild variant="ghost" size="sm" className="text-[#4c82fb] hover:text-[#7ea8ff]">
                                <a href={item.actionUrl} onClick={() => void markOne(item.id)}>
                                  {item.actionLabel ?? "Ouvrir"}
                                  <ExternalLink className="ml-2 size-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button asChild variant="ghost" size="sm" className="text-[#4c82fb] hover:text-[#7ea8ff]">
                                <Link
                                  href={item.actionUrl}
                                  onClick={() => {
                                    void markOne(item.id);
                                    setOpen(false);
                                  }}
                                >
                                  {item.actionLabel ?? "Ouvrir"}
                                  <ExternalLink className="ml-2 size-4" />
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

        <Separator className="bg-[#262b38]" />

        <div className="px-5 py-4 text-xs text-[#8b93a7]">
          <p className="font-medium text-[#e6eaf2]">Besoin d&apos;aide ?</p>
          <p className="mt-1">Le support Oniix reste joignable pour les incidents, acces et besoins d&apos;onboarding.</p>
          <a href={SUPPORT_MAILTO} className="mt-3 inline-flex text-sm font-medium text-[#4c82fb] hover:underline">
            support@oniix.space
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}

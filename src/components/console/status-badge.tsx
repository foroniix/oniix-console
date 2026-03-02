import type { ReactNode } from "react";

import { AlertTriangle, CheckCircle2, Clock3, PlayCircle, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusValue =
  | "LIVE"
  | "OFFLINE"
  | "DEGRADED"
  | "ENDED"
  | "HEALTHY"
  | "DOWN"
  | "INACTIVE"
  | "READY"
  | "DRAFT"
  | "PUBLISHED";

type StatusMeta = {
  label: string;
  className: string;
  icon: ReactNode;
  pulse?: boolean;
};

const STATUS_MAP: Record<StatusValue, StatusMeta> = {
  LIVE: {
    label: "LIVE",
    className: "border-[#ef4444]/30 bg-[#ef4444]/15 text-[#ef4444]",
    icon: <PlayCircle className="size-3.5" />,
    pulse: true,
  },
  OFFLINE: {
    label: "OFFLINE",
    className: "border-[#262b38] bg-[#1b1f2a] text-[#8b93a7]",
    icon: <WifiOff className="size-3.5" />,
  },
  DEGRADED: {
    label: "DEGRADED",
    className: "border-[#f59e0b]/30 bg-[#f59e0b]/12 text-[#f59e0b]",
    icon: <AlertTriangle className="size-3.5" />,
  },
  ENDED: {
    label: "ENDED",
    className: "border-[#262b38] bg-[#1b1f2a] text-[#8b93a7]",
    icon: <Clock3 className="size-3.5" />,
  },
  HEALTHY: {
    label: "HEALTHY",
    className: "border-[#22c55e]/30 bg-[#22c55e]/12 text-[#22c55e]",
    icon: <CheckCircle2 className="size-3.5" />,
  },
  DOWN: {
    label: "DOWN",
    className: "border-[#ef4444]/30 bg-[#ef4444]/15 text-[#ef4444]",
    icon: <AlertTriangle className="size-3.5" />,
  },
  INACTIVE: {
    label: "INACTIVE",
    className: "border-[#262b38] bg-[#1b1f2a] text-[#8b93a7]",
    icon: <Clock3 className="size-3.5" />,
  },
  READY: {
    label: "READY",
    className: "border-[#38bdf8]/30 bg-[#38bdf8]/12 text-[#38bdf8]",
    icon: <CheckCircle2 className="size-3.5" />,
  },
  DRAFT: {
    label: "DRAFT",
    className: "border-[#262b38] bg-[#1b1f2a] text-[#8b93a7]",
    icon: <Clock3 className="size-3.5" />,
  },
  PUBLISHED: {
    label: "PUBLISHED",
    className: "border-[#22c55e]/30 bg-[#22c55e]/12 text-[#22c55e]",
    icon: <CheckCircle2 className="size-3.5" />,
  },
};

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.trim().toUpperCase() as StatusValue;
  const meta =
    STATUS_MAP[normalized] ??
    ({
      label: normalized || "UNKNOWN",
      className: "border-[#262b38] bg-[#1b1f2a] text-[#8b93a7]",
      icon: <Clock3 className="size-3.5" />,
    } satisfies StatusMeta);

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]",
        meta.className,
        className
      )}
    >
      {meta.pulse ? <span className="relative inline-flex size-2 rounded-full bg-current before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-current before:opacity-50" /> : meta.icon}
      {meta.label}
    </Badge>
  );
}

import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type KpiTone = "neutral" | "success" | "warning" | "error" | "info";

const toneClassMap: Record<KpiTone, string> = {
  neutral: "border-[#262b38] bg-[#151821] text-[#e6eaf2]",
  success: "border-[#22c55e]/25 bg-[#22c55e]/10 text-[#22c55e]",
  warning: "border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]",
  error: "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]",
  info: "border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#38bdf8]",
};

type KpiRowProps = {
  children: ReactNode;
  className?: string;
};

type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: KpiTone;
  loading?: boolean;
  className?: string;
};

export function KpiRow({ children, className }: KpiRowProps) {
  return <section className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</section>;
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  loading = false,
  className,
}: KpiCardProps) {
  return (
    <article className={cn("rounded-xl border p-4", toneClassMap[tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.12em] text-[#8b93a7]">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-24 bg-white/10" />
          ) : (
            <p className="text-3xl font-semibold leading-none">{value}</p>
          )}
        </div>
        {icon ? (
          <span className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            {icon}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-3 text-xs text-[#8b93a7]">{hint}</p> : null}
    </article>
  );
}

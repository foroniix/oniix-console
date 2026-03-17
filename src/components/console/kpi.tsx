import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type KpiTone = "neutral" | "success" | "warning" | "error" | "info";

const toneClassMap: Record<KpiTone, string> = {
  neutral: "border-slate-200/80 bg-white/85 text-slate-950 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:shadow-none",
  success: "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning: "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300",
  error: "border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300",
  info: "border-sky-300/70 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300",
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
    <article className={cn("rounded-[24px] border p-4", toneClassMap[tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-24 bg-white/10" />
          ) : (
            <p className="text-3xl font-semibold leading-none">{value}</p>
          )}
        </div>
        {icon ? (
          <span className="inline-flex size-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-current dark:border-white/10 dark:bg-white/5">
            {icon}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </article>
  );
}

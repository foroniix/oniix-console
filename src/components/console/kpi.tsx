import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type KpiTone = "neutral" | "success" | "warning" | "error" | "info";

const toneClassMap: Record<KpiTone, string> = {
  neutral: "border-white/10 bg-[linear-gradient(180deg,rgba(18,28,40,0.94),rgba(10,16,24,0.9))] text-white",
  success: "border-emerald-400/18 bg-[linear-gradient(180deg,rgba(16,40,33,0.92),rgba(10,24,20,0.9))] text-emerald-50",
  warning: "border-amber-400/18 bg-[linear-gradient(180deg,rgba(50,32,13,0.92),rgba(28,18,10,0.9))] text-amber-50",
  error: "border-rose-400/18 bg-[linear-gradient(180deg,rgba(50,18,27,0.92),rgba(28,12,18,0.9))] text-rose-50",
  info: "border-sky-400/18 bg-[linear-gradient(180deg,rgba(16,34,50,0.92),rgba(10,18,28,0.9))] text-sky-50",
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
    <article className={cn("rounded-[28px] border p-5 shadow-[0_20px_46px_rgba(0,0,0,0.2)] backdrop-blur", toneClassMap[tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
          {loading ? <Skeleton className="h-9 w-24 bg-white/10" /> : <p className="text-3xl font-semibold leading-none">{value}</p>}
        </div>
        {icon ? (
          <span className="inline-flex size-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.06] text-current">
            {icon}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-4 text-xs leading-5 text-slate-400">{hint}</p> : null}
    </article>
  );
}

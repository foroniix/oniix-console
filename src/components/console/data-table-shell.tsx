import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DataTableShellProps = {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function DataTableShell({
  title,
  description,
  loading = false,
  error,
  isEmpty = false,
  emptyTitle = "Aucune donnée",
  emptyDescription = "Aucune ligne ne correspond aux filtres actuels.",
  emptyAction,
  onRetry,
  children,
  footer,
  className,
}: DataTableShellProps) {
  return (
    <section className={cn("console-panel overflow-hidden", className)}>
      <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5 dark:border-white/10">
        <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h2>
        {description ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="size-4 animate-spin" />
          Chargement...
        </div>
      ) : error ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="inline-flex size-10 items-center justify-center rounded-full border border-rose-300/70 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertTriangle className="size-5" />
          </div>
          <p className="text-sm text-slate-950 dark:text-white">{error}</p>
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              onClick={onRetry}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            >
              Réessayer
            </Button>
          ) : null}
        </div>
      ) : isEmpty ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{emptyTitle}</p>
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{emptyDescription}</p>
          {emptyAction}
        </div>
      ) : (
        <div>{children}</div>
      )}

      {footer ? <div className="border-t border-slate-200/80 px-4 py-3 sm:px-5 dark:border-white/10">{footer}</div> : null}
    </section>
  );
}

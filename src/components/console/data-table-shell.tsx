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
  emptyTitle = "Aucune donnee",
  emptyDescription = "Aucune ligne ne correspond aux filtres actuels.",
  emptyAction,
  onRetry,
  children,
  footer,
  className,
}: DataTableShellProps) {
  return (
    <section className={cn("console-panel overflow-hidden", className)}>
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" />
          Chargement des données...
        </div>
      ) : error ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="inline-flex size-11 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-300">
            <AlertTriangle className="size-5" />
          </div>
          <p className="max-w-lg text-sm text-white">{error}</p>
          {onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry}>
              Reessayer
            </Button>
          ) : null}
        </div>
      ) : isEmpty ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm font-semibold text-white">{emptyTitle}</p>
          <p className="max-w-md text-sm text-slate-400">{emptyDescription}</p>
          {emptyAction}
        </div>
      ) : (
        <div>{children}</div>
      )}

      {footer ? <div className="border-t border-white/10 px-5 py-4">{footer}</div> : null}
    </section>
  );
}

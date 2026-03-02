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
    <section className={cn("overflow-hidden rounded-xl border border-[#262b38] bg-[#151821]", className)}>
      <div className="border-b border-[#262b38] px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-[#e6eaf2]">{title}</h2>
        {description ? <p className="mt-1 text-xs text-[#8b93a7]">{description}</p> : null}
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-[#8b93a7]">
          <Loader2 className="size-4 animate-spin" />
          Chargement...
        </div>
      ) : error ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="inline-flex size-10 items-center justify-center rounded-full border border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]">
            <AlertTriangle className="size-5" />
          </div>
          <p className="text-sm text-[#e6eaf2]">{error}</p>
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              onClick={onRetry}
              className="border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2]"
            >
              Retry
            </Button>
          ) : null}
        </div>
      ) : isEmpty ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm font-semibold text-[#e6eaf2]">{emptyTitle}</p>
          <p className="max-w-md text-sm text-[#8b93a7]">{emptyDescription}</p>
          {emptyAction}
        </div>
      ) : (
        <div>{children}</div>
      )}

      {footer ? <div className="border-t border-[#262b38] px-4 py-3 sm:px-5">{footer}</div> : null}
    </section>
  );
}

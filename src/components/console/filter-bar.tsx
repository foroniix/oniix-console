import type { ReactNode } from "react";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterBarProps = {
  children: ReactNode;
  onReset?: () => void;
  resetDisabled?: boolean;
  className?: string;
};

export function FilterBar({ children, onReset, resetDisabled = false, className }: FilterBarProps) {
  return (
    <section
      className={cn(
        "console-panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{children}</div>
      {onReset ? (
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={resetDisabled}
          className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
        >
          <RotateCcw className="mr-2 size-4" />
          Réinitialiser
        </Button>
      ) : null}
    </section>
  );
}

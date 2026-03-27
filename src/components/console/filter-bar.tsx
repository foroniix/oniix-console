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
      aria-label="Barre de filtres"
      className={cn("console-toolbar flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between", className)}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{children}</div>
      {onReset ? (
        <Button type="button" variant="outline" onClick={onReset} disabled={resetDisabled}>
          <RotateCcw className="size-4" />
          {"R\u00E9initialiser"}
        </Button>
      ) : null}
    </section>
  );
}

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
        "flex flex-col gap-3 rounded-xl border border-[#262b38] bg-[#151821] p-4 lg:flex-row lg:items-center lg:justify-between",
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
          className="border-[#262b38] bg-[#1b1f2a] text-[#e6eaf2] hover:bg-[#1c2a4a]"
        >
          <RotateCcw className="mr-2 size-4" />
          Reset
        </Button>
      ) : null}
    </section>
  );
}

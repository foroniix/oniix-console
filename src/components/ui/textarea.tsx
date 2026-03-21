import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-[22px] border border-white/10 bg-[rgba(8,14,22,0.82)] px-4 py-3 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-[color,box-shadow,border-color] placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[#7ab7ff]/40 focus-visible:ring-[4px] focus-visible:ring-[#7ab7ff]/18",
        "aria-invalid:border-destructive aria-invalid:ring-[4px] aria-invalid:ring-destructive/18",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };

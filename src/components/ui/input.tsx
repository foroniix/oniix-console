import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-slate-500 selection:bg-primary selection:text-primary-foreground flex h-11 w-full min-w-0 rounded-[18px] border border-white/10 bg-[rgba(8,14,22,0.82)] px-4 py-2 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-[color,box-shadow,border-color] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[#7ab7ff]/40 focus-visible:ring-[4px] focus-visible:ring-[#7ab7ff]/18",
        "aria-invalid:border-destructive aria-invalid:ring-[4px] aria-invalid:ring-destructive/18",
        className
      )}
      {...props}
    />
  );
}

export { Input };

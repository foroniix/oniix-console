import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("console-page relative isolate animate-in fade-in-0 duration-300", className)}>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.035),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.025),transparent_20%)]" />
        <div className="console-ambient-line left-[14%] top-[4.5rem] w-[22%]" />
      </div>
      {children}
    </div>
  );
}

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
        <div
          className="console-scene-image right-[-7rem] top-[-4rem] h-[340px] w-[340px]"
          style={{ backgroundImage: "url('/branding/editorial/oniix-mobile-command.svg')" }}
        />
        <div className="console-ambient-line left-[14%] top-[4.5rem] w-[22%]" />
      </div>
      {children}
    </div>
  );
}

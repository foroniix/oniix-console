import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PanelProps = {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
};

const PADDING_STYLES = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;

export function Panel({ children, className, padding = "md" }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))]",
        PADDING_STYLES[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

import { useId } from "react";

import { cn } from "@/lib/utils";

type OniixLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  showMark?: boolean;
};

const SIZE_STYLES = {
  sm: {
    root: "gap-3",
    mark: "size-10 rounded-[20px]",
    word: "text-[1.45rem]",
    subtitle: "text-[11px]",
  },
  md: {
    root: "gap-3.5",
    mark: "size-12 rounded-[22px]",
    word: "text-[1.9rem]",
    subtitle: "text-xs",
  },
  lg: {
    root: "gap-4",
    mark: "size-[3.75rem] rounded-[26px]",
    word: "text-[2.35rem]",
    subtitle: "text-sm",
  },
} as const;

export function OniixLogo({
  className,
  size = "md",
  subtitle,
  showMark = true,
}: OniixLogoProps) {
  const gradientId = useId();
  const styles = SIZE_STYLES[size];

  return (
    <span className={cn("inline-flex items-center", styles.root, className)}>
      {showMark ? (
        <span
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-[0_20px_40px_rgba(0,0,0,0.28)]",
            styles.mark
          )}
          aria-hidden="true"
        >
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(122,183,255,0.34),transparent_40%),radial-gradient(circle_at_78%_82%,rgba(229,179,100,0.18),transparent_42%)]" />
          <svg viewBox="0 0 192 192" className="h-full w-full">
            <defs>
              <linearGradient id={`${gradientId}-line`} x1="44" y1="44" x2="148" y2="148" gradientUnits="userSpaceOnUse">
                <stop stopColor="#89C8FF" />
                <stop offset="1" stopColor="#4F8FFF" />
              </linearGradient>
              <linearGradient id={`${gradientId}-core`} x1="84" y1="78" x2="132" y2="132" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F2C275" />
                <stop offset="1" stopColor="#4F8FFF" />
              </linearGradient>
            </defs>
            <rect x="18" y="18" width="156" height="156" rx="42" fill="rgba(8,12,18,0.58)" />
            <path d="M48 58H120" stroke={`url(#${gradientId}-line)`} strokeWidth="13" strokeLinecap="round" />
            <path d="M48 92H120" stroke={`url(#${gradientId}-line)`} strokeWidth="13" strokeLinecap="round" />
            <path d="M48 126H86" stroke={`url(#${gradientId}-line)`} strokeWidth="13" strokeLinecap="round" />
            <circle cx="118" cy="126" r="24" fill={`url(#${gradientId}-core)`} />
            <circle cx="118" cy="126" r="9" fill="#F7FAFE" />
          </svg>
        </span>
      ) : null}

      <span className="min-w-0">
        <span
          className={cn(
            "block whitespace-nowrap font-[var(--font-oniix-brand)] font-semibold leading-none tracking-[-0.08em] text-white",
            styles.word
          )}
        >
          Oniix
        </span>
        {subtitle ? (
          <span className={cn("mt-1.5 block whitespace-nowrap font-medium text-[var(--text-muted)]", styles.subtitle)}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}

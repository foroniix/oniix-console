import Image from "next/image";

import { cn } from "@/lib/utils";

type OniixLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  showMark?: boolean;
};

const SIZE_STYLES = {
  sm: {
    root: "gap-2",
    wrap: "rounded-[14px] px-2 py-1.5",
    imageWidth: 82,
    imageHeight: 30,
    subtitle: "text-[10px]",
  },
  md: {
    root: "gap-2.5",
    wrap: "rounded-[18px] px-3 py-2",
    imageWidth: 112,
    imageHeight: 41,
    subtitle: "text-[11px]",
  },
  lg: {
    root: "gap-3",
    wrap: "rounded-[20px] px-3.5 py-2.5",
    imageWidth: 140,
    imageHeight: 52,
    subtitle: "text-xs",
  },
} as const;

export function OniixLogo({
  className,
  size = "md",
  subtitle,
  showMark = true,
}: OniixLogoProps) {
  const styles = SIZE_STYLES[size];

  return (
    <span className={cn("inline-flex flex-col items-start", styles.root, className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center",
          showMark
            ? `border border-white/10 bg-white/[0.03] shadow-[0_18px_36px_rgba(0,0,0,0.24)] ${styles.wrap}`
            : ""
        )}
      >
        <Image
          src="/branding/oniix-logo-official.png"
          alt="Oniix"
          width={styles.imageWidth}
          height={styles.imageHeight}
          priority={size !== "sm"}
          className="h-auto w-auto max-w-none"
        />
      </span>

      {subtitle ? (
        <span className={cn("block whitespace-nowrap font-medium text-[var(--text-muted)]", styles.subtitle)}>
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}

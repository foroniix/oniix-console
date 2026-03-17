import { cn } from "@/lib/utils";

type OniixLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  showMark?: boolean;
};

const SIZE_STYLES = {
  sm: {
    root: "gap-2.5",
    mark: "size-9 rounded-2xl",
    word: "text-[1.9rem]",
    subtitle: "text-[11px]",
  },
  md: {
    root: "gap-3",
    mark: "size-11 rounded-[18px]",
    word: "text-[2.35rem]",
    subtitle: "text-xs",
  },
  lg: {
    root: "gap-3.5",
    mark: "size-14 rounded-[22px]",
    word: "text-[2.95rem]",
    subtitle: "text-sm",
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
    <span className={cn("inline-flex items-center", styles.root, className)}>
      {showMark ? (
        <span
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-[#c8d3ff] bg-[linear-gradient(180deg,#f9fbff,#eef2ff)] shadow-[0_20px_50px_-34px_rgba(64,86,200,0.55)]",
            styles.mark
          )}
          aria-hidden="true"
        >
          <svg viewBox="0 0 192 192" className="h-full w-full">
            <defs>
              <linearGradient id="oniix-mark-fill" x1="32" y1="24" x2="164" y2="168" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4D65DA" />
                <stop offset="1" stopColor="#3148BE" />
              </linearGradient>
            </defs>
            <rect x="10" y="10" width="172" height="172" rx="52" fill="url(#oniix-mark-fill)" />
            <path
              d="M96 48C122.51 48 144 69.49 144 96C144 122.51 122.51 144 96 144C69.49 144 48 122.51 48 96C48 69.49 69.49 48 96 48ZM96 69C81.09 69 69 81.09 69 96C69 110.91 81.09 123 96 123C110.91 123 123 110.91 123 96C123 81.09 110.91 69 96 69Z"
              fill="#ffffff"
            />
            <circle cx="133" cy="57" r="10" fill="#8FA1FF" fillOpacity="0.85" />
          </svg>
        </span>
      ) : null}

      <span className="min-w-0">
        <span
          className={cn(
            "block whitespace-nowrap font-[var(--font-oniix-brand)] text-[#4056c8] italic font-black leading-none tracking-[-0.08em]",
            styles.word
          )}
        >
          Oniix
        </span>
        {subtitle ? (
          <span className={cn("mt-1 block whitespace-nowrap font-medium text-slate-500", styles.subtitle)}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}

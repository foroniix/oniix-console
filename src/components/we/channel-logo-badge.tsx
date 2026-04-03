import { MediaThumb } from "@/features/web-viewer/media/media-thumb";
import { cn } from "@/lib/utils";

type ChannelLogoBadgeProps = {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_STYLES = {
  sm: "h-10 w-10 rounded-xl",
  md: "h-12 w-12 rounded-2xl",
  lg: "h-16 w-16 rounded-[1.35rem]",
} as const;

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "TV";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function ChannelLogoBadge({
  name,
  logoUrl,
  size = "md",
  className,
}: ChannelLogoBadgeProps) {
  return (
    <MediaThumb
      src={logoUrl}
      alt={`${name} logo`}
      fit="contain"
      className={cn(
        "relative shrink-0 overflow-hidden border border-white/10 bg-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.22)]",
        SIZE_STYLES[size],
        className
      )}
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] text-xs font-semibold uppercase tracking-[0.12em] text-white">
          {getInitials(name)}
        </div>
      }
    />
  );
}

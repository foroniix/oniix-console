"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { pickMediaUrl } from "./media.utils";

type MediaThumbProps = {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  fit?: "cover" | "contain";
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  fallback?: ReactNode;
  loading?: "lazy" | "eager";
};

export function MediaThumb({
  src,
  fallbackSrc,
  alt,
  fit = "cover",
  className,
  imgClassName,
  fallbackClassName,
  fallback,
  loading = "lazy",
}: MediaThumbProps) {
  const primarySrc = useMemo(() => pickMediaUrl(src), [src]);
  const backupSrc = useMemo(() => pickMediaUrl(fallbackSrc), [fallbackSrc]);
  const failureKey = `${primarySrc ?? ""}|${backupSrc ?? ""}`;
  const [failure, setFailure] = useState<{ key: string; stage: "primary" | "backup" } | null>(null);
  const failedState = failure?.key === failureKey ? failure.stage : "idle";

  const resolvedSrc =
    failedState === "primary"
      ? backupSrc
      : failedState === "backup"
        ? null
        : primarySrc ?? backupSrc;
  const showFallback = !resolvedSrc;

  return (
    <div className={cn("relative overflow-hidden bg-black/40", className)}>
      {resolvedSrc ? (
        <Image
          fill
          unoptimized
          src={resolvedSrc}
          alt={alt}
          sizes="100vw"
          loading={loading}
          onError={() => {
            if (failedState === "idle" && backupSrc && primarySrc && primarySrc !== backupSrc) {
              setFailure({ key: failureKey, stage: "primary" });
              return;
            }
            setFailure({ key: failureKey, stage: "backup" });
          }}
          className={cn(
            "absolute inset-0 h-full w-full",
            fit === "contain" ? "object-contain p-2" : "object-cover",
            imgClassName
          )}
        />
      ) : null}

      {showFallback ? (
        <div
          className={cn(
            "absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))]",
            fallbackClassName
          )}
        >
          {fallback}
        </div>
      ) : null}
    </div>
  );
}

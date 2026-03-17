"use client";

import * as React from "react";

import { SUPPORT_MAILTO } from "@/lib/console-branding";
import { cn } from "@/lib/utils";

type SupportMailLinkProps = Omit<React.ComponentPropsWithoutRef<"a">, "href">;

export const SupportMailLink = React.forwardRef<HTMLAnchorElement, SupportMailLinkProps>(
  ({ className, onClick, children, ...props }, ref) => {
    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (typeof window !== "undefined") {
          event.preventDefault();
          window.location.assign(SUPPORT_MAILTO);
        }
      },
      [onClick]
    );

    return (
      <a
        {...props}
        ref={ref}
        href={SUPPORT_MAILTO}
        onClick={handleClick}
        className={cn(className)}
      >
        {children}
      </a>
    );
  }
);

SupportMailLink.displayName = "SupportMailLink";

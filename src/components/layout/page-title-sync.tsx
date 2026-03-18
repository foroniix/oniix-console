"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { resolveRoute } from "@/components/layout/navigation";
import { CONSOLE_PRODUCT_NAME } from "@/lib/console-branding";

export function PageTitleSync() {
  const pathname = usePathname();

  React.useEffect(() => {
    const route = resolveRoute(pathname);
    const nextTitle = route.label ? `${route.label} | Oniix` : CONSOLE_PRODUCT_NAME;
    document.title = nextTitle;
  }, [pathname]);

  return null;
}

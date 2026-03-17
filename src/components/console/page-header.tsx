import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type Breadcrumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "console-hero px-5 py-5 sm:px-6 sm:py-6",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {breadcrumbs.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              {breadcrumbs.map((item, index) => (
                <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
                  {index > 0 ? <ChevronRight className="size-3.5" /> : null}
                  {item.href ? (
                    <Link href={item.href} className="hover:text-slate-950 dark:hover:text-white">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-slate-950 dark:text-white">{item.label}</span>
                  )}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            {icon ? (
              <span className="mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/75 text-[#2563eb] dark:border-white/10 dark:bg-white/[0.05] dark:text-[#60a5fa]">
                {icon}
              </span>
            ) : null}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h1>
              {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
            </div>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

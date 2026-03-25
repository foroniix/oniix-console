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
    <header className={cn("console-hero px-6 py-5 sm:px-7 sm:py-6", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/12" />
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3.5">
          {breadcrumbs.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {breadcrumbs.map((item, index) => (
                <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
                  {index > 0 ? <ChevronRight className="size-3.5" /> : null}
                  {item.href ? (
                    <Link href={item.href} className="transition hover:text-white">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-slate-300">{item.label}</span>
                  )}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-start gap-4">
            {icon ? (
              <span className="mt-0.5 inline-flex size-[3.1rem] shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                {icon}
              </span>
            ) : null}
            <div>
              <h1 className="text-[2rem] font-semibold tracking-[-0.045em] text-white sm:text-[2.15rem]">{title}</h1>
              {subtitle ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/88 sm:text-[0.94rem]">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

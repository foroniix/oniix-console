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
    <header className={cn("console-hero px-6 py-6 sm:px-7 sm:py-7", className)}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4">
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
              <span className="mt-1 inline-flex size-[3.25rem] shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.05] text-[var(--brand-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                {icon}
              </span>
            ) : null}
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[2.2rem]">{title}</h1>
              {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[0.96rem]">{subtitle}</p> : null}
            </div>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

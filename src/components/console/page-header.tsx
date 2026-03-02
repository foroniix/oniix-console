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
        "rounded-2xl border border-[#262b38] bg-[#151821] px-5 py-4 sm:px-6",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {breadcrumbs.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 text-xs text-[#8b93a7]">
              {breadcrumbs.map((item, index) => (
                <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
                  {index > 0 ? <ChevronRight className="size-3.5" /> : null}
                  {item.href ? (
                    <Link href={item.href} className="hover:text-[#e6eaf2]">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-[#e6eaf2]">{item.label}</span>
                  )}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            {icon ? (
              <span className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#262b38] bg-[#1b1f2a] text-[#4c82fb]">
                {icon}
              </span>
            ) : null}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#e6eaf2]">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-[#8b93a7]">{subtitle}</p> : null}
            </div>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

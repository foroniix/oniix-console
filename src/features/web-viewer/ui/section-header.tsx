import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  detail?: string;
  action?: ReactNode;
};

export function SectionHeader({ eyebrow, title, detail, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-2 font-[var(--font-we-display)] text-2xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        {detail ? <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

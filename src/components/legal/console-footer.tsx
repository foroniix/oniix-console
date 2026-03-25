import Link from "next/link";

import { SupportMailLink } from "@/components/support/support-mail-link";
import { SUPPORT_EMAIL } from "@/lib/console-branding";
import { cn } from "@/lib/utils";

type ConsoleFooterProps = {
  compact?: boolean;
  className?: string;
};

export function ConsoleFooter({ compact = false, className }: ConsoleFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "rounded-[26px] border border-white/10 bg-[rgba(6,18,31,0.78)] px-5 py-4 text-sm text-slate-300 shadow-[0_20px_42px_rgba(0,0,0,0.22)] backdrop-blur-xl",
        compact && "rounded-[22px] px-4 py-3 text-xs",
        className
      )}
    >
      <div className={cn("flex flex-col gap-3 md:flex-row md:items-center md:justify-between", compact && "gap-2.5")}>
        <div className="space-y-1">
          <p className="font-medium text-white">(c) {year} Oniix Console. Pilotage OTT multi-tenant.</p>
          <p className="text-slate-400">Accès, gouvernance et support plateforme.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <Link href="/privacy" className="transition hover:text-white">
            Confidentialité
          </Link>
          <Link href="/cookies" className="transition hover:text-white">
            Cookies
          </Link>
          <SupportMailLink className="font-medium text-slate-100 hover:text-[var(--brand-primary)]">
            {SUPPORT_EMAIL}
          </SupportMailLink>
        </div>
      </div>
    </footer>
  );
}

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
        "rounded-[24px] border border-[#d8cdbe] bg-[rgba(248,242,235,0.82)] px-4 py-4 text-sm text-[#6d655c] shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
        compact && "rounded-[20px] px-4 py-3 text-xs",
        className
      )}
    >
      <div className={cn("flex flex-col gap-3 md:flex-row md:items-center md:justify-between", compact && "gap-2")}>
        <div className="space-y-1">
          <p className="font-medium text-slate-900 dark:text-white">
            © {year} Oniix. Plateforme de pilotage OTT pour chaînes, éditeurs et applications.
          </p>
          <p className="text-[#7a7066] dark:text-slate-400">
            Sessions sécurisées, gouvernance multi-éditeur, support opérationnel et conformité produit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <Link href="/privacy" className="transition hover:text-slate-950 dark:hover:text-white">
            Confidentialité
          </Link>
          <Link href="/cookies" className="transition hover:text-slate-950 dark:hover:text-white">
            Cookies
          </Link>
          <SupportMailLink className="font-medium text-slate-900 hover:text-[#3549be] dark:text-white dark:hover:text-[#7cb4ff]">
            {SUPPORT_EMAIL}
          </SupportMailLink>
        </div>
      </div>
    </footer>
  );
}

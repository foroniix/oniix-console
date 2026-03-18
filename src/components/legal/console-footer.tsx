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
        "rounded-[24px] border border-[#223249] bg-[rgba(10,18,30,0.82)] px-4 py-4 text-sm text-slate-300 shadow-[0_14px_30px_rgba(0,0,0,0.14)] backdrop-blur",
        compact && "rounded-[20px] px-4 py-3 text-xs",
        className
      )}
    >
      <div className={cn("flex flex-col gap-3 md:flex-row md:items-center md:justify-between", compact && "gap-2")}>
        <div className="space-y-1">
          <p className="font-medium text-white">
            © {year} Oniix. Plateforme de pilotage OTT pour chaînes, éditeurs et applications.
          </p>
          <p className="text-slate-400">
            Sessions sécurisées, gouvernance multi-éditeur, support opérationnel et conformité produit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <Link href="/privacy" className="transition hover:text-white">
            Confidentialité
          </Link>
          <Link href="/cookies" className="transition hover:text-white">
            Cookies
          </Link>
          <SupportMailLink className="font-medium text-slate-100 hover:text-[#7cb4ff]">
            {SUPPORT_EMAIL}
          </SupportMailLink>
        </div>
      </div>
    </footer>
  );
}

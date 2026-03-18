"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "oniix.cookie-consent";
const COOKIE_NAME = "oniix-cookie-consent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type ConsentMode = "essential" | "all";

function persistConsent(mode: ConsentMode) {
  const payload = JSON.stringify({
    mode,
    updated_at: new Date().toISOString(),
  });

  try {
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // Ignore storage issues on restricted environments.
  }

  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(mode)}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax; Secure`;
}

export function CookieBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setVisible(true);
        return;
      }

      const parsed = JSON.parse(stored) as { mode?: ConsentMode } | null;
      setVisible(!parsed?.mode);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = React.useCallback((mode: ConsentMode) => {
    persistConsent(mode);
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6">
      <div
        className={cn(
          "pointer-events-auto mx-auto max-w-6xl rounded-[28px] border border-[#d8cdbe] bg-[rgba(248,242,235,0.96)] p-4 shadow-[0_24px_60px_rgba(39,37,33,0.16)] backdrop-blur",
          "dark:border-white/10 dark:bg-[#0f1724]/94 dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a7066] dark:text-slate-400">
              Préférences cookies
            </p>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Oniix utilise des cookies de session indispensables et des mesures d’usage produit.
            </h2>
            <p className="text-sm leading-6 text-[#655d53] dark:text-slate-300">
              Les cookies essentiels maintiennent la connexion et la sécurité. Les cookies de mesure nous aident à
              améliorer l’expérience console et les parcours d’accès. Tu peux en savoir plus dans la page{" "}
              <Link href="/cookies" className="font-medium text-[#3549be] hover:text-[#2f40aa] dark:text-[#7cb4ff]">
                Cookies
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button variant="outline" className="border-[#d8cdbe] bg-white/80 text-slate-700 hover:bg-white" onClick={() => accept("essential")}>
              Essentiels uniquement
            </Button>
            <Button className="bg-[#3549be] text-white hover:bg-[#2f40aa]" onClick={() => accept("all")}>
              Tout accepter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

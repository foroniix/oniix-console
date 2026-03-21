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
          "pointer-events-auto mx-auto max-w-6xl rounded-[28px] border border-[#223249] bg-[rgba(10,18,30,0.96)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl"
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Preferences cookies
            </p>
            <h2 className="text-lg font-semibold text-white">
              Oniix utilise des cookies de session indispensables et des mesures d&apos;usage produit.
            </h2>
            <p className="text-sm leading-6 text-slate-300">
              Les cookies essentiels maintiennent la connexion et la securite. Les cookies de mesure nous aident a
              ameliorer l&apos;experience console et les parcours d&apos;acces. Tu peux en savoir plus dans la page{" "}
              <Link href="/cookies" className="font-medium text-[#7cb4ff] hover:text-[#9bc6ff]">
                Cookies
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              variant="outline"
              className="border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-100 hover:bg-white/6"
              onClick={() => accept("essential")}
            >
              Essentiels uniquement
            </Button>
            <Button className="bg-[#3b5fa6] text-white hover:bg-[#4a72c2]" onClick={() => accept("all")}>
              Tout accepter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

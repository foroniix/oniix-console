"use client";

import { useEffect, useState } from "react";
import AdsDashboardPremium from "@/components/ads/AdsDashboardPremium";

type MeResponse =
  | {
      ok: true;
      access_token: string;
      user: {
        id: string;
        email?: string | null;
        role?: string | null;
        tenant_id?: string | null;
        full_name?: string | null;
        avatar_url?: string | null;
      };
    }
  | { ok: false; error: string };

export default function AdsPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as MeResponse | null;

        if (!mounted) return;

        if (res.ok && json && "ok" in json && json.ok) {
          setAccessToken(json.access_token);
          setTenantId(json.user.tenant_id ?? null);
        } else {
          setAccessToken(null);
          setTenantId(null);
        }
      } catch {
        if (!mounted) return;
        setAccessToken(null);
        setTenantId(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return <AdsDashboardPremium accessToken={accessToken} tenantId={tenantId} />;
}

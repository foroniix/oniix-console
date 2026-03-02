"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import AnalyticsDashboard from "../_components/analytics-dashboard";
import SuperadminDashboard from "../_components/superadmin-dashboard";
import { Card, CardContent } from "@/components/ui/card";

type MeResponse =
  | {
      ok: true;
      user: {
        role?: string | null;
      };
    }
  | { ok: false; error?: string };

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as MeResponse | null;
        if (!mounted || !res.ok || !json || !("ok" in json) || !json.ok) return;
        const role = (json.user.role ?? "").toLowerCase();
        setIsSuperadmin(role === "superadmin");
      } catch {
        // ignore and fallback to tenant dashboard
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-[240px] items-center justify-center gap-3 text-zinc-400">
          <Loader2 className="size-5 animate-spin" />
          Chargement du dashboard...
        </CardContent>
      </Card>
    );
  }

  return isSuperadmin ? <SuperadminDashboard /> : <AnalyticsDashboard />;
}


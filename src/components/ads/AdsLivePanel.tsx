"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MousePointerClick, Eye, Activity } from "lucide-react";
import { useAdsRealtime } from "@/lib/ads/useAdsRealtime";

type Kpi = { impressions: number; clicks: number; ctr: number; since: string; window_hours: number };

function fmt(n: number) {
  return (n ?? 0).toLocaleString();
}

export default function AdsLivePanel(props: {
  accessToken: string | null;
  tenantId: string | null;
  streamId?: string | null;
}) {
  const { accessToken, tenantId, streamId } = props;
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);

  const { counters, events } = useAdsRealtime({
    accessToken,
    tenantId,
    streamId,
    enabled: !!accessToken && !!tenantId,
  });

  useEffect(() => {
    if (!accessToken || !tenantId) return;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ads/kpi?hours=24`, { cache: "no-store" });
        const json = await res.json();
        if (res.ok) setKpi(json);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, tenantId]);

  if (!accessToken || !tenantId) {
    return (
      <div className="p-6 text-zinc-500 text-sm">
        Impossible de démarrer le live Ads (session/tenant manquant).
      </div>
    );
  }

  const baseImp = kpi?.impressions ?? 0;
  const baseClk = kpi?.clicks ?? 0;

  const liveImp = counters.impressions;
  const liveClk = counters.clicks;

  const totalImp = baseImp + liveImp;
  const totalClk = baseClk + liveClk;
  const ctr = totalImp > 0 ? (totalClk / totalImp) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Eye className="h-4 w-4 text-zinc-600" />
              Impressions (24h + live)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-white">{fmt(totalImp)}</div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Live: +{fmt(liveImp)}{" "}
              {counters.lastEventAt ? `• ${new Date(counters.lastEventAt).toLocaleTimeString()}` : ""}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-zinc-600" />
              Clics (24h + live)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-white">{fmt(totalClk)}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Live: +{fmt(liveClk)}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Activity className="h-4 w-4 text-zinc-600" />
              CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-white">{ctr.toFixed(2)}%</div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Base: {(kpi?.ctr ?? 0).toFixed(2)}% {loading ? "• sync..." : ""}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] uppercase tracking-widest text-zinc-500">
            Events live (max 50)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !kpi ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement KPI...
            </div>
          ) : null}

          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="text-zinc-600 text-sm py-6 text-center">Aucun event live pour le moment.</div>
            ) : (
              events.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-lg bg-white/5 border border-white/5 px-3 py-2"
                >
                  <div className="text-xs text-zinc-300">
                    <span className="font-bold text-white">{e.event}</span>
                    {e.stream_id ? (
                      <span className="text-zinc-500"> • stream {String(e.stream_id).slice(0, 8)}…</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-zinc-500">{new Date(e.created_at).toLocaleTimeString()}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

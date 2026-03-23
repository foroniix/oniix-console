"use client";

import { useEffect, useState } from "react";
import { Activity, Eye, Loader2, MousePointerClick } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdsRealtime } from "@/lib/ads/useAdsRealtime";

type Kpi = { impressions: number; clicks: number; ctr: number; since: string; window_hours: number };

function fmt(value: number) {
  return (value ?? 0).toLocaleString("fr-FR");
}

function eventLabel(event: string) {
  const key = event.toLowerCase();
  if (key.includes("click")) return "Clic";
  if (key.includes("impression")) return "Impression";
  if (key.includes("view")) return "Vue";
  return "Activité";
}

export default function AdsLivePanel(props: { streamId?: string | null }) {
  const { streamId } = props;
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);

  const { counters, events } = useAdsRealtime({
    streamId: streamId ?? null,
    enabled: true,
    windowSec: 300,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/ads/kpi?hours=24", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as Kpi | null;
        if (!cancelled && res.ok && json) setKpi(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalImpressions = (kpi?.impressions ?? 0) + counters.impressions;
  const totalClicks = (kpi?.clicks ?? 0) + counters.clicks;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/5 bg-zinc-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-500">
              <Eye className="h-4 w-4 text-zinc-600" />
              Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-white">{fmt(totalImpressions)}</div>
            <div className="mt-1 text-[11px] text-zinc-500">
              Fenêtre live : {fmt(counters.impressions)}
              {counters.lastEventAt ? ` - ${new Date(counters.lastEventAt).toLocaleTimeString("fr-FR")}` : ""}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-500">
              <MousePointerClick className="h-4 w-4 text-zinc-600" />
              Clics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-white">{fmt(totalClicks)}</div>
            <div className="mt-1 text-[11px] text-zinc-500">Fenêtre live : {fmt(counters.clicks)}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-500">
              <Activity className="h-4 w-4 text-zinc-600" />
              CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-white">{ctr.toFixed(2)}%</div>
            <div className="mt-1 text-[11px] text-zinc-500">
              Base 24h : {(kpi?.ctr ?? 0).toFixed(2)}% {loading ? "- actualisation..." : ""}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-zinc-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] uppercase tracking-widest text-zinc-500">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !kpi ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des indicateurs...
            </div>
          ) : null}

          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="py-6 text-center text-sm text-zinc-600">Aucune activité récente pour le moment.</div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                >
                  <div className="text-xs text-zinc-300">
                    <span className="font-bold text-white">{eventLabel(event.event)}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {new Date(event.created_at).toLocaleTimeString("fr-FR")}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

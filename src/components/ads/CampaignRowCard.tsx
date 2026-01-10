"use client";

import { useMemo, useState } from "react";
import { Pencil, PauseCircle, PlayCircle, Archive, Trash2, MoreVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import CampaignFormDialog from "./CampaignFormDialog";

export type Campaign = {
  id: string;
  tenant_id: string;
  name: string;
  type: string; // DISPLAY | PREROLL | ...
  priority: number;
  status: "active" | "paused" | "archived";
  targeting: any;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

function badgeTone(status: Campaign["status"]) {
  if (status === "active") return "bg-emerald-500/10 border-emerald-500/20 text-emerald-300";
  if (status === "paused") return "bg-amber-500/10 border-amber-500/20 text-amber-300";
  return "bg-zinc-500/10 border-white/10 text-zinc-300";
}

function fmtDate(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function CampaignRowCard({
  campaign,
  onChanged,
}: {
  campaign: Campaign;
  onChanged: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const scheduleLabel = useMemo(() => {
    if (!campaign.starts_at && !campaign.ends_at) return "Toujours actif (si status=active)";
    return `${campaign.starts_at ? `Début: ${fmtDate(campaign.starts_at)}` : "Début: —"} • ${
      campaign.ends_at ? `Fin: ${fmtDate(campaign.ends_at)}` : "Fin: —"
    }`;
  }, [campaign.starts_at, campaign.ends_at]);

  const patch = async (body: any) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/ads/campaigns/${encodeURIComponent(campaign.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Update failed");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    const ok = confirm("Supprimer cette campagne ? (les creatives liées seront supprimées)");
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/ads/campaigns/${encodeURIComponent(campaign.id)}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="bg-zinc-900/40 border-white/5">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            {/* Left */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className={cn("text-[10px] uppercase tracking-widest border rounded-md px-2 py-1", badgeTone(campaign.status))}>
                  {campaign.status}
                </div>
                <div className="text-sm font-semibold text-white truncate">{campaign.name}</div>
                <div className="text-[10px] text-zinc-500 border border-white/10 rounded-md px-2 py-1">
                  {campaign.type} • prio {campaign.priority}
                </div>
              </div>

              <div className="mt-2 text-[11px] text-zinc-500">
                {scheduleLabel}
              </div>

              <div className="mt-1 text-[10px] text-zinc-600 font-mono">
                id: {campaign.id}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                className="border border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => setEditOpen(true)}
                disabled={busy}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Button>

              {campaign.status === "active" ? (
                <Button
                  variant="ghost"
                  className="border border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                  onClick={() => patch({ status: "paused" })}
                  disabled={busy}
                >
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              ) : campaign.status === "paused" ? (
                <Button
                  variant="ghost"
                  className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                  onClick={() => patch({ status: "active" })}
                  disabled={busy}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Activer
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="border border-white/10 bg-white/5 hover:bg-white/10"
                  onClick={() => patch({ status: "active" })}
                  disabled={busy}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Réactiver
                </Button>
              )}

              <Button
                variant="ghost"
                className="border border-white/10 bg-white/5 hover:bg-white/10"
                onClick={() => patch({ status: "archived" })}
                disabled={busy || campaign.status === "archived"}
                title="Archiver"
              >
                <Archive className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                className="border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                onClick={del}
                disabled={busy}
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit modal */}
      <CampaignFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Modifier la campagne"
        initial={campaign}
        onSaved={() => {
          setEditOpen(false);
          onChanged();
        }}
      />
    </>
  );
}

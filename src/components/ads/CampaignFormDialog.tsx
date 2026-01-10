"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

import type { Campaign } from "./CampaignRowCard";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial: Campaign | null;
  onSaved: () => void;
};

function toLocalInputValue(ts?: string | null) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local expects "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInputValue(v: string) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function CampaignFormDialog({ open, onOpenChange, title, initial, onSaved }: Props) {
  const isEdit = !!initial?.id;

  const [name, setName] = useState("");
  const [type, setType] = useState("DISPLAY");
  const [priority, setPriority] = useState<number>(100);
  const [status, setStatus] = useState<"active" | "paused" | "archived">("active");

  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");

  const [targetingText, setTargetingText] = useState<string>("{}");
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setError("");
    if (initial) {
      setName(initial.name ?? "");
      setType(initial.type ?? "DISPLAY");
      setPriority(Number(initial.priority ?? 100));
      setStatus((initial.status ?? "active") as any);

      setStartsAt(toLocalInputValue(initial.starts_at));
      setEndsAt(toLocalInputValue(initial.ends_at));

      try {
        setTargetingText(JSON.stringify(initial.targeting ?? {}, null, 2));
      } catch {
        setTargetingText("{}");
      }
    } else {
      setName("");
      setType("DISPLAY");
      setPriority(100);
      setStatus("active");
      setStartsAt("");
      setEndsAt("");
      setTargetingText("{}");
    }
  }, [open, initial]);

  const targetingJson = useMemo(() => {
    try {
      const obj = JSON.parse(targetingText || "{}");
      return { ok: true as const, value: obj };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "JSON invalide" };
    }
  }, [targetingText]);

  const submit = async () => {
    setError("");

    if (!name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    if (!targetingJson.ok) {
      setError(`Targeting invalide: ${targetingJson.error}`);
      return;
    }
    if (endsAt && startsAt && new Date(endsAt) < new Date(startsAt)) {
      setError("La date de fin doit être après la date de début.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        type,
        priority: Number(priority ?? 100),
        status,
        targeting: targetingJson.value,
        starts_at: fromLocalInputValue(startsAt),
        ends_at: fromLocalInputValue(endsAt),
      };

      const url = isEdit ? `/api/ads/campaigns/${encodeURIComponent(initial!.id)}` : "/api/ads/campaigns";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Impossible de sauvegarder");

      onSaved();
    } catch (e: any) {
      setError(e?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Basics */}
          <Card className="bg-zinc-900/40 border-white/5">
            <CardContent className="p-4 grid gap-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500">Nom</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-zinc-950/60 border-white/10"
                    placeholder="Ex: Promo Chaîne Sport"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="h-10 rounded-md bg-zinc-950/60 border border-white/10 px-3 text-sm"
                  >
                    <option value="DISPLAY">DISPLAY</option>
                    <option value="PREROLL">PREROLL</option>
                    <option value="MIDROLL">MIDROLL</option>
                    <option value="OVERLAY">OVERLAY</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500">Priorité</label>
                  <Input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="bg-zinc-950/60 border-white/10"
                    placeholder="100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500">Statut</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="h-10 rounded-md bg-zinc-950/60 border border-white/10 px-3 text-sm"
                  >
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="archived">archived</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500">Raccourci</label>
                  <div className="h-10 rounded-md bg-white/5 border border-white/10 px-3 flex items-center text-xs text-zinc-400">
                    {isEdit ? "Edition" : "Création"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className="bg-zinc-900/40 border-white/5">
            <CardContent className="p-4 grid gap-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Planification</div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500">Début</label>
                  <Input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="bg-zinc-950/60 border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500">Fin</label>
                  <Input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="bg-zinc-950/60 border-white/10"
                  />
                </div>
              </div>

              <div className="text-[11px] text-zinc-500">
                Si aucune date n’est fournie, la campagne est “toujours active” (si status=active).
              </div>
            </CardContent>
          </Card>

          {/* Targeting */}
          <Card className="bg-zinc-900/40 border-white/5">
            <CardContent className="p-4 grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Targeting (JSON)</div>
                <div className="text-[10px] text-zinc-500">
                  Ex: {"{ streams: ['uuid'], countries: ['FR'] }"}
                </div>
              </div>

              <textarea
                value={targetingText}
                onChange={(e) => setTargetingText(e.target.value)}
                className="min-h-[150px] w-full rounded-md bg-zinc-950/60 border border-white/10 px-3 py-2 text-xs font-mono text-zinc-200"
                spellCheck={false}
              />

              {!targetingJson.ok ? (
                <div className="text-[11px] text-rose-300">
                  JSON invalide: {targetingJson.error}
                </div>
              ) : (
                <div className="text-[11px] text-emerald-300">JSON valide</div>
              )}
            </CardContent>
          </Card>

          {error ? (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-rose-200 text-sm">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="border border-white/10 bg-white/5 hover:bg-white/10"
            disabled={saving}
          >
            Annuler
          </Button>

          <Button onClick={submit} className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

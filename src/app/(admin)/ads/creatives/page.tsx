"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Campaign = { id: string; name: string; type: string; active: boolean };
type Creative = {
  id: string;
  campaign_id: string;
  name: string;
  media_type: string;
  media_url: string;
  click_url: string | null;
  active: boolean;
  created_at: string;
};

type ListCampaignsResp = { ok: true; campaigns: Campaign[] } | { ok: false; error: string };
type ListCreativesResp = { ok: true; creatives: Creative[] } | { ok: false; error: string };

export default function CreativesPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [campaignId, setCampaignId] = useState<string>("");
  const [name, setName] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [clickUrl, setClickUrl] = useState("");
  const [active, setActive] = useState(true);

  const activeCampaigns = useMemo(() => campaigns.filter((c) => c.active), [campaigns]);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, crRes] = await Promise.all([
        fetch("/api/ads/campaigns", { cache: "no-store" }),
        fetch("/api/ads/creatives", { cache: "no-store" }),
      ]);
      const cJson = (await cRes.json().catch(() => null)) as ListCampaignsResp | null;
      const crJson = (await crRes.json().catch(() => null)) as ListCreativesResp | null;

      if (cJson && "ok" in cJson && cJson.ok) setCampaigns(cJson.campaigns);
      if (crJson && "ok" in crJson && crJson.ok) setCreatives(crJson.creatives);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!campaignId) return toast.error("Choisissez une campagne");
    if (!name.trim()) return toast.error("Nom obligatoire");
    if (!mediaUrl.trim()) return toast.error("media_url obligatoire");
    setSaving(true);
    try {
      const res = await fetch("/api/ads/creatives", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          name: name.trim(),
          media_type: mediaType,
          media_url: mediaUrl.trim(),
          click_url: clickUrl.trim() || null,
          active,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) return toast.error(json?.error || "Erreur création");
      toast.success("Creative créée");
      setOpen(false);
      setCampaignId("");
      setName("");
      setMediaType("image");
      setMediaUrl("");
      setClickUrl("");
      setActive(true);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const ok = confirm("Supprimer cette créative ?");
    if (!ok) return;
    const res = await fetch(`/api/ads/creatives/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) return toast.error(json?.error || "Erreur suppression");
    toast.success("Supprimée");
    await load();
  };

  return (
    <div className="console-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-slate-950 dark:text-white">Créatives</CardTitle>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Assets pub (image / video) attachés à une campagne.</p>
          </div>

          <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle créative
          </Button>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement…
            </div>
          ) : creatives.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-slate-500 dark:text-slate-400">Aucune créative.</div>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.02]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200/80 bg-slate-50/90 dark:border-white/10 dark:bg-white/[0.03]">
                    <TableHead className="text-slate-500 dark:text-slate-400">Nom</TableHead>
                    <TableHead className="text-slate-500 dark:text-slate-400">Campagne</TableHead>
                    <TableHead className="text-slate-500 dark:text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-500 dark:text-slate-400">Actif</TableHead>
                    <TableHead className="text-right text-slate-500 dark:text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creatives.map((c) => (
                    <TableRow key={c.id} className="border-slate-200/80 dark:border-white/10">
                      <TableCell className="font-semibold text-slate-950 dark:text-white">
                        <div className="truncate max-w-[320px]">{c.name}</div>
                        <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{c.id.slice(0, 8)}…</div>
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {campaigns.find((x) => x.id === c.campaign_id)?.name ?? c.campaign_id.slice(0, 8) + "…"}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{c.media_type}</TableCell>
                      <TableCell>
                        <div
                          className={cn(
                            "inline-flex items-center rounded-md border px-2 py-1 text-[10px]",
                            c.active
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                              : "border-white/10 bg-white/5 text-zinc-400"
                          )}
                        >
                          {c.active ? "ON" : "OFF"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          onClick={() => remove(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => (saving ? null : setOpen(v))}>
        <DialogContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
          <DialogHeader>
            <DialogTitle>Nouvelle créative</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Campagne</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger className="console-field">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                  {activeCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="console-field" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Media type</Label>
                <Select value={mediaType} onValueChange={setMediaType}>
                  <SelectTrigger className="console-field">
                    <SelectValue placeholder="image" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                    <SelectItem value="image">image</SelectItem>
                    <SelectItem value="video">video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                <div>
                  <div className="text-sm font-semibold">Active</div>
                  <div className="text-xs text-zinc-500">Sélectionnable</div>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Media URL</Label>
              <Input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://…"
                className="console-field"
              />
            </div>

            <div className="grid gap-2">
              <Label>Click URL (optionnel)</Label>
              <Input
                value={clickUrl}
                onChange={(e) => setClickUrl(e.target.value)}
                placeholder="https://…"
                className="console-field"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={create} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

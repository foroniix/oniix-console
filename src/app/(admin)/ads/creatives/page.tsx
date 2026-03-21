"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTableShell } from "@/components/console/data-table-shell";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [campaignId, setCampaignId] = useState("");
  const [name, setName] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [clickUrl, setClickUrl] = useState("");
  const [active, setActive] = useState(true);

  const activeCampaigns = useMemo(() => campaigns.filter((campaign) => campaign.active), [campaigns]);
  const stats = useMemo(() => {
    const activeCount = creatives.filter((creative) => creative.active).length;
    return {
      total: creatives.length,
      active: activeCount,
      inactive: Math.max(0, creatives.length - activeCount),
      campaigns: activeCampaigns.length,
    };
  }, [activeCampaigns.length, creatives]);

  const resetForm = () => {
    setCampaignId("");
    setName("");
    setMediaType("image");
    setMediaUrl("");
    setClickUrl("");
    setActive(true);
  };

  const load = async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);

    setLoadError(null);

    try {
      const [campaignsRes, creativesRes] = await Promise.all([
        fetch("/api/ads/campaigns", { cache: "no-store" }),
        fetch("/api/ads/creatives", { cache: "no-store" }),
      ]);

      const campaignsJson = (await campaignsRes.json().catch(() => null)) as ListCampaignsResp | null;
      const creativesJson = (await creativesRes.json().catch(() => null)) as ListCreativesResp | null;

      if (campaignsJson && "ok" in campaignsJson && campaignsJson.ok) setCampaigns(campaignsJson.campaigns);
      if (creativesJson && "ok" in creativesJson && creativesJson.ok) setCreatives(creativesJson.creatives);

      if (!campaignsJson || !("ok" in campaignsJson) || !campaignsJson.ok || !creativesJson || !("ok" in creativesJson) || !creativesJson.ok) {
        const message =
          (campaignsJson && "error" in campaignsJson && campaignsJson.error) ||
          (creativesJson && "error" in creativesJson && creativesJson.error) ||
          "Impossible de charger les creatives.";
        setLoadError(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load(false);
  }, []);

  const create = async () => {
    if (!campaignId) return toast.error("Choisissez une campagne");
    if (!name.trim()) return toast.error("Nom obligatoire");
    if (!mediaUrl.trim()) return toast.error("media_url obligatoire");

    setSaving(true);
    try {
      const response = await fetch("/api/ads/creatives", {
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
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) return toast.error(json?.error || "Erreur creation");

      toast.success("Creative creee");
      setOpen(false);
      resetForm();
      await load(true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const confirmed = confirm("Supprimer cette creative ?");
    if (!confirmed) return;
    const response = await fetch(`/api/ads/creatives/${id}`, { method: "DELETE" });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) return toast.error(json?.error || "Erreur suppression");
    toast.success("Creative supprimee");
    await load(true);
  };

  return (
    <PageShell>
      <PageHeader
        title="Creatives"
        subtitle="Centralisez les assets publicitaires relies aux campagnes, avec controle d activation et de destination."
        breadcrumbs={[
          { label: "Oniix Console", href: "/dashboard" },
          { label: "Publicite", href: "/ads" },
          { label: "Creatives" },
        ]}
        icon={<ImagePlus className="size-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => void load(true)}>
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              Nouvelle creative
            </Button>
          </>
        }
      />

      <KpiRow>
        <KpiCard label="Creatives total" value={stats.total} hint="Inventaire complet des assets publicitaires." icon={<ImagePlus className="size-4" />} loading={loading} />
        <KpiCard label="Actives" value={stats.active} hint="Creatives eligibles a la diffusion." tone="success" icon={<Plus className="size-4" />} loading={loading} />
        <KpiCard label="Inactives" value={stats.inactive} hint="Assets conserves mais non selectionnables." tone="warning" icon={<Trash2 className="size-4" />} loading={loading} />
        <KpiCard label="Campagnes actives" value={stats.campaigns} hint="Campagnes actuellement disponibles pour rattachement." tone="info" icon={<RefreshCw className="size-4" />} loading={loading} />
      </KpiRow>

      <DataTableShell
        title="Bibliotheque creative"
        description={`${creatives.length} creative(s) rattachee(s) a ${campaigns.length} campagne(s).`}
        loading={loading}
        error={loadError}
        onRetry={() => void load(false)}
        isEmpty={!loading && !loadError && creatives.length === 0}
        emptyTitle="Aucune creative"
        emptyDescription="Ajoutez un asset image ou video pour alimenter une campagne."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Campagne</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Etat</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creatives.map((creative) => (
              <TableRow key={creative.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="max-w-[320px] truncate font-semibold text-white">{creative.name}</div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      {creative.id.slice(0, 8)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">
                  {campaigns.find((campaign) => campaign.id === creative.campaign_id)?.name ?? `${creative.campaign_id.slice(0, 8)}...`}
                </TableCell>
                <TableCell className="text-slate-300">{creative.media_type}</TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "border",
                      creative.active
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                        : "border-white/10 bg-white/[0.05] text-slate-300"
                    )}
                  >
                    {creative.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => void remove(creative.id)} title="Supprimer">
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <Dialog open={open} onOpenChange={(value) => (saving ? undefined : setOpen(value))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle creative</DialogTitle>
            <DialogDescription>Rattachez un asset image ou video a une campagne active et cadrez sa destination.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="creative-campaign">Campagne</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger id="creative-campaign" className="w-full">
                  <SelectValue placeholder="Choisir une campagne" />
                </SelectTrigger>
                <SelectContent>
                  {activeCampaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="creative-name">Nom</Label>
              <Input id="creative-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="creative-media-type">Media type</Label>
                <Select value={mediaType} onValueChange={setMediaType}>
                  <SelectTrigger id="creative-media-type" className="w-full">
                    <SelectValue placeholder="image" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">image</SelectItem>
                    <SelectItem value="video">video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-white">Active</div>
                  <div className="text-xs text-slate-500">Selectionnable dans le moteur.</div>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="creative-media-url">Media URL</Label>
              <Input
                id="creative-media-url"
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="creative-click-url">Click URL</Label>
              <Input
                id="creative-click-url"
                value={clickUrl}
                onChange={(event) => setClickUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={() => void create()} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

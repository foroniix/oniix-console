"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Megaphone } from "lucide-react";
import { toast } from "sonner";

import { DataTableShell } from "@/components/console/data-table-shell";
import { FilterBar } from "@/components/console/filter-bar";
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

type Campaign = {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  priority: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  status?: string | null;
};

type ListResponse = { ok: true; campaigns: Campaign[] } | { ok: false; error: string };
type MutResponse = { ok: true; campaign: Campaign } | { ok: false; error: string };
type DeleteResponse = { ok: true } | { ok: false; error: string };

function fmtDateTime(iso?: string | null) {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR");
}

function toLocalInputValue(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function CampaignsPage() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("HOUSE");
  const [priority, setPriority] = useState(50);
  const [active, setActive] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rows;
    return rows.filter((row) => {
      return (row.name || "").toLowerCase().includes(normalizedQuery) || (row.type || "").toLowerCase().includes(normalizedQuery);
    });
  }, [query, rows]);

  const stats = useMemo(() => {
    const activeCount = rows.filter((row) => row.active).length;
    const archivedCount = rows.filter((row) => row.status === "ARCHIVED").length;
    return {
      total: rows.length,
      active: activeCount,
      archived: archivedCount,
      visible: filtered.length,
    };
  }, [filtered.length, rows]);

  const resetForm = () => {
    setName("");
    setType("HOUSE");
    setPriority(50);
    setActive(true);
    setStartsAt("");
    setEndsAt("");
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (campaign: Campaign) => {
    setEditing(campaign);
    setName(campaign.name ?? "");
    setType(campaign.type ?? "HOUSE");
    setPriority(typeof campaign.priority === "number" ? campaign.priority : 50);
    setActive(Boolean(campaign.active));
    setStartsAt(toLocalInputValue(campaign.starts_at));
    setEndsAt(toLocalInputValue(campaign.ends_at));
    setOpen(true);
  };

  const load = async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);

    setLoadError(null);

    try {
      const response = await fetch("/api/ads/campaigns", { cache: "no-store" });
      const json = (await response.json().catch(() => null)) as ListResponse | null;
      if (json && "ok" in json && json.ok) {
        setRows(json.campaigns);
      } else {
        setRows([]);
        const message = json && "error" in json ? json.error : "Impossible de charger les campagnes.";
        setLoadError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load(false);
  }, []);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Nom obligatoire");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        type,
        priority: Number(priority) || 0,
        active,
        starts_at: fromLocalInputValue(startsAt),
        ends_at: fromLocalInputValue(endsAt),
      };

      const response = await fetch(editing ? `/api/ads/campaigns/${editing.id}` : "/api/ads/campaigns", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json().catch(() => null)) as MutResponse | null;
      if (!response.ok || !json || !("ok" in json) || !json.ok) {
        toast.error(json && "error" in json ? json.error : "Erreur de sauvegarde.");
        return;
      }

      toast.success(editing ? "Campagne mise a jour" : "Campagne creee");
      setOpen(false);
      await load(true);
    } finally {
      setSaving(false);
    }
  };

  const archive = async (campaign: Campaign) => {
    const confirmed = confirm(`Archiver la campagne "${campaign.name}" ?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/ads/campaigns/${campaign.id}`, { method: "DELETE" });
      const json = (await response.json().catch(() => null)) as DeleteResponse | null;
      if (!response.ok || !json?.ok) {
        toast.error((json && "error" in json && json.error) || "Erreur de suppression.");
        return;
      }
      toast.success("Campagne archivee");
      await load(true);
    } catch {
      toast.error("Erreur reseau");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Campagnes publicitaires"
        subtitle="Pilotez les campagnes, leur fenêtre et leur priorisation."
        breadcrumbs={[
          { label: "Oniix Console", href: "/dashboard" },
          { label: "Publicite", href: "/ads" },
          { label: "Campagnes" },
        ]}
        icon={<Megaphone className="size-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => void load(true)}>
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nouvelle campagne
            </Button>
          </>
        }
      />

      <KpiRow>
        <KpiCard label="Campagnes total" value={stats.total} hint="Inventaire complet des campagnes du tenant." icon={<Megaphone className="size-4" />} loading={loading} />
        <KpiCard label="Actives" value={stats.active} hint="Campagnes eligibles au ciblage actuel." tone="success" icon={<Check className="size-4" />} loading={loading} />
        <KpiCard label="Archivees" value={stats.archived} hint="Campagnes retirees des decisions automatiques." tone="warning" icon={<Trash2 className="size-4" />} loading={loading} />
        <KpiCard label="Resultats visibles" value={stats.visible} hint="Resultat courant avec le filtre de recherche." tone="info" icon={<Search className="size-4" />} loading={loading} />
      </KpiRow>

      <DataTableShell
        title="Portefeuille de campagnes"
        description={`${filtered.length} campagne(s) visibles sur ${rows.length}.`}
        loading={loading}
        error={loadError}
        onRetry={() => void load(false)}
        isEmpty={!loading && !loadError && filtered.length === 0}
        emptyTitle="Aucune campagne"
        emptyDescription="Creez une campagne ou elargissez votre recherche."
      >
        <FilterBar onReset={() => setQuery("")} resetDisabled={!query}>
          <div className="min-w-[260px] flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Rechercher une campagne"
                placeholder="Rechercher par nom ou type"
                className="pl-9"
              />
            </div>
          </div>
        </FilterBar>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priorite</TableHead>
              <TableHead>Etat</TableHead>
              <TableHead>Fenetre</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="max-w-[320px] truncate font-semibold text-white">{campaign.name}</span>
                      {campaign.status === "ARCHIVED" ? <Badge variant="secondary">Archivee</Badge> : null}
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      {campaign.id.slice(0, 8)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">{campaign.type}</TableCell>
                <TableCell className="font-mono text-slate-300">{campaign.priority}</TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "border",
                      campaign.active
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                        : "border-white/10 bg-white/[0.05] text-slate-300"
                    )}
                  >
                    {campaign.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  <div>Debut: {fmtDateTime(campaign.starts_at)}</div>
                  <div>Fin: {fmtDateTime(campaign.ends_at)}</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-2">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(campaign)} title="Modifier">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => void archive(campaign)} title="Archiver">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <Dialog open={open} onOpenChange={(value) => (saving ? undefined : setOpen(value))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la campagne" : "Nouvelle campagne"}</DialogTitle>
            <DialogDescription>
              Cadrez le type, la priorite et la fenetre de diffusion avant exposition dans le moteur publicitaire.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="campaign-name">Nom</Label>
              <Input id="campaign-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="campaign-type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="campaign-type" className="w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOUSE">HOUSE</SelectItem>
                    <SelectItem value="DIRECT">DIRECT</SelectItem>
                    <SelectItem value="SPONSOR">SPONSOR</SelectItem>
                    <SelectItem value="PROGRAMMATIC">PROGRAMMATIC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="campaign-priority">Priorite</Label>
                <Input
                  id="campaign-priority"
                  type="number"
                  value={priority}
                  onChange={(event) => setPriority(Number(event.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-white">Active</div>
                <div className="text-xs text-slate-500">La campagne peut etre selectionnee automatiquement selon vos regles.</div>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="campaign-start">Debut</Label>
                <Input id="campaign-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="campaign-end">Fin</Label>
                <Input id="campaign-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

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
import { Check, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

type ListResponse =
  | { ok: true; campaigns: Campaign[] }
  | { ok: false; error: string };

type MutResponse =
  | { ok: true; campaign: Campaign }
  | { ok: false; error: string };

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function toLocalInputValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local expects YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function fromLocalInputValue(v: string) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function CampaignsPage() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("HOUSE");
  const [priority, setPriority] = useState(50);
  const [active, setActive] = useState(true);
  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => (r.name || "").toLowerCase().includes(s) || (r.type || "").toLowerCase().includes(s));
  }, [rows, q]);

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

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setName(c.name ?? "");
    setType(c.type ?? "HOUSE");
    setPriority(typeof c.priority === "number" ? c.priority : 50);
    setActive(!!c.active);
    setStartsAt(toLocalInputValue(c.starts_at));
    setEndsAt(toLocalInputValue(c.ends_at));
    setOpen(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ads/campaigns", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ListResponse | null;
      if (json && "ok" in json && json.ok) {
        setRows(json.campaigns);
      } else {
        setRows([]);
        toast.error(json && "error" in json ? json.error : "Impossible de charger les campagnes");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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

      const res = await fetch(editing ? `/api/ads/campaigns/${editing.id}` : "/api/ads/campaigns", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as MutResponse | null;
      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        toast.error(json && "error" in json ? json.error : "Erreur sauvegarde");
        return;
      }

      toast.success(editing ? "Campagne mise à jour" : "Campagne créée");
      setOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const archive = async (c: Campaign) => {
    const ok = confirm(`Archiver la campagne “${c.name}” ?`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/ads/campaigns/${c.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.ok) {
        toast.error(json?.error || "Erreur suppression");
        return;
      }
      toast.success("Campagne archivée");
      await load();
    } catch {
      toast.error("Erreur réseau");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950/60 border-white/10">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-white">Campagnes</CardTitle>
            <p className="text-sm text-zinc-500 mt-1">
              Gestion multi-tenant : ces campagnes sont isolées par <span className="font-mono">tenant_id</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 text-zinc-600 absolute left-3 top-2.5" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (nom, type)…"
                className="pl-9 bg-zinc-900/50 border-white/10 text-zinc-100 w-64"
              />
            </div>
            <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Nouvelle campagne
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement…
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-600">Aucune campagne.</div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-900/40 border-white/10">
                    <TableHead className="text-zinc-400">Nom</TableHead>
                    <TableHead className="text-zinc-400">Type</TableHead>
                    <TableHead className="text-zinc-400">Prio</TableHead>
                    <TableHead className="text-zinc-400">Actif</TableHead>
                    <TableHead className="text-zinc-400">Fenêtre</TableHead>
                    <TableHead className="text-right text-zinc-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="border-white/10">
                      <TableCell className="font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[320px]">{c.name}</span>
                          {c.status === "ARCHIVED" ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-zinc-400">
                              ARCHIVED
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">{c.id.slice(0, 8)}…</div>
                      </TableCell>
                      <TableCell className="text-zinc-300">{c.type}</TableCell>
                      <TableCell className="text-zinc-300 font-mono">{c.priority}</TableCell>
                      <TableCell>
                        <div
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px]",
                            c.active
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                              : "border-white/10 bg-white/5 text-zinc-400"
                          )}
                        >
                          {c.active ? <Check className="h-3 w-3" /> : null}
                          {c.active ? "ON" : "OFF"}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs">
                        <div>Début: {fmtDateTime(c.starts_at)}</div>
                        <div>Fin: {fmtDateTime(c.ends_at)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" className="hover:bg-white/5" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            onClick={() => archive(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la campagne" : "Nouvelle campagne"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-900/50 border-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="bg-zinc-900/50 border-white/10">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800">
                    <SelectItem value="HOUSE">HOUSE</SelectItem>
                    <SelectItem value="DIRECT">DIRECT</SelectItem>
                    <SelectItem value="SPONSOR">SPONSOR</SelectItem>
                    <SelectItem value="PROGRAMMATIC">PROGRAMMATIC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Priorité</Label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="bg-zinc-900/50 border-white/10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
              <div>
                <div className="text-sm font-semibold">Active</div>
                <div className="text-xs text-zinc-500">La campagne peut être sélectionnée par le decision endpoint.</div>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Début (optionnel)</Label>
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="bg-zinc-900/50 border-white/10"
                />
              </div>
              <div className="grid gap-2">
                <Label>Fin (optionnel)</Label>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="bg-zinc-900/50 border-white/10"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

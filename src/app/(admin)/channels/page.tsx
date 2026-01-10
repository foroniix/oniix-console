"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

import { Channel, listChannels, toggleChannel, upsertChannel } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit3,
  MoreHorizontal,
  Plus,
  Power,
  RefreshCw,
  Search,
  Tv,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const CATS = [
  "Actualité",
  "Sports",
  "Music",
  "Réligion",
  "Films et Séries",
  "Documentaire",
  "Art",
  "Mode",
  "Faits Divers",
  "Animé",
  "Manga",
  "Autre"
] as const;

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";

export default function ChannelsPage() {
  const [rows, setRows] = useState<Channel[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("ALL");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");

  const [editing, setEditing] = useState<Channel | null>(null);
  const [form, setForm] = useState<Partial<Channel>>({
    name: "",
    slug: "",
    category: "Actualité",
    active: true,
    logo: ""
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await listChannels();
      setRows(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((c) => c.active).length;
    const inactive = total - active;
    const categories = new Set(rows.map((c) => c.category)).size;
    return { total, active, inactive, categories };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q);

      const matchesCat = catFilter === "ALL" || row.category === catFilter;

      const matchesActive =
        activeFilter === "ALL" ||
        (activeFilter === "ACTIVE" && row.active) ||
        (activeFilter === "INACTIVE" && !row.active);

      return matchesSearch && matchesCat && matchesActive;
    });
  }, [rows, searchQuery, catFilter, activeFilter]);

  const startCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      slug: "",
      category: "Actualité",
      active: true,
      logo: ""
    });
    setOpen(true);
  };

  const startEdit = (c: Channel) => {
    setEditing(c);
    setForm({ ...c });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) return;
    setBusy(true);
    try {
      const saved = await upsertChannel(
        editing ? { ...form, id: editing.id } : form
      );

      setRows((prev) => {
        const i = prev.findIndex((x) => x.id === saved.id);
        if (i >= 0) {
          const cp = [...prev];
          cp[i] = saved;
          return cp;
        }
        return [saved, ...prev];
      });

      setOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const onToggle = async (c: Channel) => {
    const newValue = !c.active;
    setRows((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, active: newValue } : x))
    );

    try {
      await toggleChannel(c.id, newValue);
    } catch (e) {
      setRows((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, active: !newValue } : x))
      );
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setCatFilter("ALL");
    setActiveFilter("ALL");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* background */}
      <div className="fixed inset-0 -z-10 bg-zinc-950" />
      <div className="fixed inset-0 -z-10 opacity-60 [background:radial-gradient(900px_circle_at_15%_0%,rgba(99,102,241,0.14),transparent_55%),radial-gradient(900px_circle_at_85%_25%,rgba(16,185,129,0.07),transparent_55%)]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TOPBAR */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-4 bg-zinc-950/70 backdrop-blur-xl border-b border-white/5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Tv className="h-5 w-5 text-indigo-300" />
              </div>

              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  Chaînes TV
                </h1>
                <p className="text-sm text-zinc-400">
                  Catalogue, identité visuelle et disponibilité des chaînes.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge className="bg-white/5 border border-white/10 text-zinc-200">
                    Total: {stats.total}
                  </Badge>
                  <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                    Actives: {stats.active}
                  </Badge>
                  <Badge className="bg-zinc-800/60 border border-white/10 text-zinc-200">
                    Inactives: {stats.inactive}
                  </Badge>
                  <Badge className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                    Catégories: {stats.categories}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
              >
                <RefreshCw
                  className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")}
                />
                Actualiser
              </Button>

              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    onClick={startCreate}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_0_1px_rgba(99,102,241,0.30),0_12px_28px_rgba(79,70,229,0.18)]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle chaîne
                  </Button>
                </SheetTrigger>

                <SheetContent
                  side="right"
                  className="w-[460px] sm:max-w-[520px] bg-zinc-950 text-zinc-100 border-l border-white/10 p-0"
                >
                  {/* Header premium */}
                  <div className="px-6 pt-6 pb-4 border-b border-white/10 bg-zinc-950/60 backdrop-blur-xl">
                    <SheetHeader className="space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <SheetTitle className="text-xl font-semibold tracking-tight">
                            {editing ? "Modifier la chaîne" : "Créer une chaîne"}
                          </SheetTitle>
                          <SheetDescription className="text-zinc-400">
                            Définissez l’identité et la configuration.
                          </SheetDescription>
                        </div>

                        {/* Status badge (kept) */}
                        <div className="flex items-center gap-2">
                          {form.active ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Identity strip */}
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-14 w-14 rounded-2xl border border-white/10 bg-zinc-900">
                            <AvatarImage
                              src={form.logo || ""}
                              className="object-cover"
                            />
                            <AvatarFallback className="rounded-2xl bg-zinc-900 text-zinc-400 font-semibold">
                              {(form.name || "TV").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">
                              {form.name?.trim()
                                ? form.name
                                : "Nom de la chaîne"}
                            </p>
                            <p className="text-xs text-zinc-400 mt-1">
                              Slug:{" "}
                              <span className="font-mono text-zinc-200">
                                {form.slug?.trim() ? `/${form.slug}` : "—"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2">
                          <Label className="text-zinc-300">URL du logo</Label>
                          <Input
                            placeholder="https://…"
                            value={form.logo || ""}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, logo: e.target.value }))
                            }
                            className="bg-zinc-950/40 border-white/10"
                          />
                          <p className="text-[11px] text-zinc-500">
                            Utilisez une image carrée (512×512) pour un rendu net.
                          </p>
                        </div>
                      </div>
                    </SheetHeader>
                  </div>

                  {/* Body */}
                  <div className="px-6 py-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Informations
                        </p>
                        <p className="text-xs text-zinc-400">
                          Nom, catégorie, slug.
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-zinc-300">Nom</Label>
                        <Input
                          placeholder="Ex: ONIIX Sports 1"
                          value={form.name || ""}
                          onChange={(e) => {
                            const name = e.target.value;
                            setForm((f) => ({
                              ...f,
                              name,
                              slug:
                                !editing && (!f.slug || f.slug.trim() === "")
                                  ? slugify(name)
                                  : f.slug
                            }));
                          }}
                          className="bg-zinc-950/40 border-white/10"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-zinc-300">Catégorie</Label>
                          <Select
                            value={(form.category as any) || "Actualité"}
                            onValueChange={(v) =>
                              setForm((f) => ({ ...f, category: v as any }))
                            }
                          >
                            <SelectTrigger className="bg-zinc-950/40 border-white/10">
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-950 border-white/10 text-zinc-100">
                              {CATS.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-zinc-300">Slug</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  slug: slugify(f.name || "")
                                }))
                              }
                            >
                              Générer
                            </Button>
                          </div>
                          <Input
                            placeholder="ex: oniix-sports-1"
                            value={form.slug || ""}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, slug: e.target.value }))
                            }
                            className="bg-zinc-950/40 border-white/10 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* NOTE: visibility card removed as requested */}

                    {editing ? (
                      <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
                        <p className="text-xs text-zinc-500">
                          ID:{" "}
                          <span className="font-mono text-zinc-300">
                            {editing.id}
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Footer sticky */}
                  <div className="sticky bottom-0 border-t border-white/10 bg-zinc-950/70 backdrop-blur-xl px-6 py-4">
                    <SheetFooter className="gap-2">
                      <Button
                        onClick={() => setOpen(false)}
                        variant="outline"
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={save}
                        disabled={busy || !form.name?.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
                      >
                        {busy ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          "Enregistrer"
                        )}
                      </Button>
                    </SheetFooter>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Table container */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
          {/* Toolbar */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Rechercher par nom ou slug…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-950/40 border-white/10"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-full sm:w-[210px] bg-zinc-950/40 border-white/10">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/10 text-zinc-100">
                  <SelectItem value="ALL">Toutes catégories</SelectItem>
                  {CATS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={activeFilter}
                onValueChange={(v) => setActiveFilter(v as ActiveFilter)}
              >
                <SelectTrigger className="w-full sm:w-[170px] bg-zinc-950/40 border-white/10">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/10 text-zinc-100">
                  <SelectItem value="ALL">Tous</SelectItem>
                  <SelectItem value="ACTIVE">Actives</SelectItem>
                  <SelectItem value="INACTIVE">Inactives</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
                onClick={resetFilters}
              >
                Réinitialiser
              </Button>

              <Badge className="bg-white/5 border border-white/10 text-zinc-200">
                {filteredRows.length} résultat{filteredRows.length > 1 ? "s" : ""}
              </Badge>
            </div>
          </div>

          {/* Table */}
          <div className="min-h-[520px]">
            <Table>
              <TableHeader className="bg-zinc-950/30">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-zinc-400 pl-6">Chaîne</TableHead>
                  <TableHead className="text-zinc-400">Catégorie</TableHead>
                  <TableHead className="text-zinc-400">Slug</TableHead>
                  <TableHead className="text-zinc-400">Statut</TableHead>
                  <TableHead className="text-right text-zinc-400 pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-zinc-500">
                      Aucun résultat. Essayez d’ajuster la recherche ou les filtres.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((c) => (
                    <TableRow
                      key={c.id}
                      className="border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 rounded-xl border border-white/10 bg-zinc-900">
                            <AvatarImage src={c.logo || ""} className="object-cover" />
                            <AvatarFallback className="rounded-xl text-xs font-semibold text-zinc-500">
                              {c.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <div className="font-medium text-zinc-100 truncate">
                              {c.name}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {c.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className="bg-white/5 border border-white/10 text-zinc-200">
                          {c.category}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <code className="text-xs text-zinc-300 bg-zinc-950/40 px-2 py-1 rounded-md border border-white/10">
                          /{c.slug}
                        </code>
                      </TableCell>

                      <TableCell>
                        {c.active ? (
                          <span className="inline-flex items-center gap-2 text-sm text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-sm text-zinc-400">
                            <XCircle className="h-4 w-4" />
                            Inactive
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-9 w-9 p-0 text-zinc-400 hover:text-white hover:bg-white/5"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            align="end"
                            className="bg-zinc-950 border-white/10 text-zinc-200"
                          >
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />

                            <DropdownMenuItem
                              onClick={() => startEdit(c)}
                              className="focus:bg-white/5 cursor-pointer"
                            >
                              <Edit3 className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => onToggle(c)}
                              className="focus:bg-white/5 cursor-pointer"
                            >
                              <Power
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  c.active ? "text-rose-300" : "text-emerald-300"
                                )}
                              />
                              {c.active ? "Désactiver" : "Activer"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

function slugify(input: string) {
  return (input || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Edit3, Link2, Loader2, MoreHorizontal, Plus, Power, Radio, RefreshCw, Search, Tv } from "lucide-react";

import { type Category, type Channel, type ChannelRealtimeStats, getChannelRealtimeStats, listChannels, toggleChannel, upsertChannel } from "@/lib/data";
import { cn } from "@/lib/utils";
import { DataTableShell } from "@/components/console/data-table-shell";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CATS: Array<{ value: Category; label: string }> = [
  { value: "Sports", label: "Sports" },
  { value: "Music", label: "Musique" },
  { value: "Religion", label: "Religion" },
  { value: "Documentaire", label: "Documentaire" },
  { value: "Art", label: "Art" },
  { value: "Mode", label: "Mode" },
  { value: "Faits Divers", label: "Faits divers" },
  { value: "Anime", label: "Anime" },
  { value: "Manga", label: "Manga" },
  { value: "Autre", label: "Autre" },
];
const EMPTY_FORM: Partial<Channel> = { name: "", slug: "", category: "Autre" as Category, active: true, logo: "", originHlsUrl: "" };

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";
type OriginFilter = "ALL" | "CONFIGURED" | "MISSING";

function slugify(input: string) {
  return (input || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function err(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function minute(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function categoryLabel(category: string) {
  return CATS.find((item) => item.value === category)?.label ?? category;
}

function Health({ status }: { status: "ok" | "degraded" | "down" | null }) {
  if (status === "ok") return <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200">OK</Badge>;
  if (status === "degraded") return <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-200">Dégradé</Badge>;
  if (status === "down") return <Badge className="border-rose-500/25 bg-rose-500/10 text-rose-200">Hors service</Badge>;
  return <Badge variant="outline">Non contrôlé</Badge>;
}

export default function ChannelsPage() {
  const [rows, setRows] = useState<Channel[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [statsByChannel, setStatsByChannel] = useState<Record<string, ChannelRealtimeStats>>({});
  const [statsLoadingId, setStatsLoadingId] = useState<string | null>(null);
  const [statsError, setStatsError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("ALL");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("ALL");
  const [editing, setEditing] = useState<Channel | null>(null);
  const [form, setForm] = useState<Partial<Channel>>(EMPTY_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      setRows(await listChannels());
    } catch (error) {
      setPageError(err(error, "Impossible de charger le catalogue des chaînes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((row) => row.active).length;
    const withOrigin = rows.filter((row) => Boolean(row.originHlsUrl?.trim())).length;
    return { total, active, inactive: total - active, withOrigin, missingOrigin: total - withOrigin, categories: new Set(rows.map((row) => row.category)).size };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !q || row.name.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q);
      const matchesCat = catFilter === "ALL" || row.category === catFilter;
      const matchesActive = activeFilter === "ALL" || (activeFilter === "ACTIVE" && row.active) || (activeFilter === "INACTIVE" && !row.active);
      const hasOrigin = Boolean(row.originHlsUrl?.trim());
      const matchesOrigin = originFilter === "ALL" || (originFilter === "CONFIGURED" && hasOrigin) || (originFilter === "MISSING" && !hasOrigin);
      return matchesSearch && matchesCat && matchesActive && matchesOrigin;
    });
  }, [activeFilter, catFilter, originFilter, rows, searchQuery]);

  const loadChannelStats = useCallback(async (channelId: string) => {
    setStatsLoadingId(channelId);
    setStatsError("");
    try {
      const next = await getChannelRealtimeStats(channelId, { minutes: 5 });
      setStatsByChannel((prev) => ({ ...prev, [channelId]: next }));
    } catch (error) {
      setStatsError(err(error, "Impossible de charger les statistiques OTT."));
    } finally {
      setStatsLoadingId((current) => (current === channelId ? null : current));
    }
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setStatsError("");
    setOpen(true);
  };

  const startEdit = (channel: Channel) => {
    setEditing(channel);
    setForm({ ...channel });
    setFormError("");
    setStatsError("");
    setOpen(true);
    void loadChannelStats(channel.id);
  };

  const save = async () => {
    if (!form.name?.trim()) return;
    setBusy(true);
    setFormError("");
    try {
      const saved = await upsertChannel({ ...form, ...(editing ? { id: editing.id } : {}), name: form.name.trim(), slug: form.slug?.trim() || slugify(form.name) });
      setRows((prev) => {
        const index = prev.findIndex((row) => row.id === saved.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      setFormError(err(error, "Impossible d’enregistrer la chaîne."));
    } finally {
      setBusy(false);
    }
  };

  const onToggle = async (channel: Channel) => {
    const nextActive = !channel.active;
    setPageError("");
    setRows((prev) => prev.map((row) => (row.id === channel.id ? { ...row, active: nextActive } : row)));
    try {
      await toggleChannel(channel.id, nextActive);
    } catch (error) {
      setRows((prev) => prev.map((row) => (row.id === channel.id ? { ...row, active: !nextActive } : row)));
      setPageError(err(error, "Impossible de modifier le statut de la chaîne."));
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setCatFilter("ALL");
    setActiveFilter("ALL");
    setOriginFilter("ALL");
  };

  const editingStats = editing ? statsByChannel[editing.id] ?? null : null;
  const isStatsLoading = Boolean(editing && statsLoadingId === editing.id);

  return (
    <PageShell>
      <PageHeader
        title="Catalogue chaînes"
        subtitle="Gérez les chaînes, le branding et la readiness HLS."
        breadcrumbs={[{ label: "Oniix Console", href: "/dashboard" }, { label: "Catalogue" }, { label: "Chaînes TV" }]}
        icon={<Tv className="size-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => void loadData()}><RefreshCw className={cn("size-4", loading && "animate-spin")} />Actualiser</Button>
            <Button onClick={startCreate}><Plus className="size-4" />Nouvelle chaîne</Button>
          </>
        }
      />

      <KpiRow>
        <KpiCard label="Catalogue" value={stats.total} hint="Chaînes configurées" icon={<Tv className="size-4" />} loading={loading && rows.length === 0} />
        <KpiCard label="Actives" value={stats.active} hint={`${stats.inactive} hors diffusion`} icon={<Radio className="size-4" />} tone="success" loading={loading && rows.length === 0} />
        <KpiCard label="Origines prêtes" value={stats.withOrigin} hint={`${stats.missingOrigin} à raccorder`} icon={<Link2 className="size-4" />} tone={stats.missingOrigin > 0 ? "warning" : "info"} loading={loading && rows.length === 0} />
        <KpiCard label="Catégories" value={stats.categories} hint="Segmentation éditoriale" icon={<Activity className="size-4" />} loading={loading && rows.length === 0} />
      </KpiRow>

      {pageError ? <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{pageError}</div> : null}
      {stats.missingOrigin > 0 ? <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{stats.missingOrigin} chaîne(s) n’ont pas encore d’origine HLS. Tant que ce point reste ouvert, la gateway ne peut pas servir un playback propre.</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>Pilotage du catalogue</CardTitle>
          <CardDescription>Recherche, filtres d’activation et lecture rapide du niveau de readiness OTT.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><Input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} aria-label="Rechercher une chaîne" placeholder="Rechercher par nom ou slug" className="pl-11" /></div>
            <Select value={catFilter} onValueChange={setCatFilter}><SelectTrigger className="w-full"><SelectValue placeholder="Catégorie" /></SelectTrigger><SelectContent><SelectItem value="ALL">Toutes catégories</SelectItem>{CATS.map((category) => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}</SelectContent></Select>
            <Select value={originFilter} onValueChange={(value) => setOriginFilter(value as OriginFilter)}><SelectTrigger className="w-full"><SelectValue placeholder="Origine HLS" /></SelectTrigger><SelectContent><SelectItem value="ALL">Toutes les origines</SelectItem><SelectItem value="CONFIGURED">Origine configurée</SelectItem><SelectItem value="MISSING">Origine manquante</SelectItem></SelectContent></Select>
            <Button variant="outline" onClick={resetFilters}>Réinitialiser</Button>
          </div>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex rounded-[18px] border border-white/10 bg-white/[0.03] p-1">{[{ label: "Tous", value: "ALL" }, { label: "Actives", value: "ACTIVE" }, { label: "Inactives", value: "INACTIVE" }].map((item) => <button key={item.value} type="button" aria-pressed={activeFilter === item.value} onClick={() => setActiveFilter(item.value as ActiveFilter)} className={cn("rounded-[14px] px-3 py-2 text-xs font-semibold transition", activeFilter === item.value ? "bg-white text-slate-950" : "text-slate-400 hover:text-white")}>{item.label}</button>)}</div>
            <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{filteredRows.length} résultat(s)</Badge><Badge variant="outline">{stats.total} chaîne(s)</Badge>{stats.missingOrigin > 0 ? <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-200">{stats.missingOrigin} origine(s) manquante(s)</Badge> : null}</div>
          </div>
        </CardContent>
      </Card>

      <DataTableShell title="Chaînes TV" description="Catalogue éditorial, identité visuelle, readiness playback et actions opérateur." loading={loading && rows.length === 0} error={!rows.length ? pageError || undefined : undefined} onRetry={() => void loadData()} isEmpty={!pageError && filteredRows.length === 0} emptyTitle="Aucune chaîne" emptyDescription="Aucune chaîne ne correspond aux filtres actifs." emptyAction={<Button onClick={startCreate}><Plus className="size-4" />Créer une chaîne</Button>} footer={<div className="flex flex-col gap-2 text-xs uppercase tracking-[0.14em] text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>{filteredRows.length} ligne(s) affichée(s)</span><span>{stats.withOrigin} origine(s) prêtes | {stats.active} chaîne(s) actives</span></div>}>
        <Table>
          <TableHeader><TableRow><TableHead>Chaîne</TableHead><TableHead>Catégorie</TableHead><TableHead>Slug</TableHead><TableHead>Origine HLS</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredRows.map((channel) => <TableRow key={channel.id}><TableCell><div className="flex min-w-0 items-center gap-3"><Avatar className="size-11 rounded-[18px] border border-white/10 bg-white/[0.04]"><AvatarImage src={channel.logo || ""} className="object-cover" /><AvatarFallback className="rounded-[18px] bg-white/[0.06] text-xs font-semibold text-slate-300">{channel.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><div className="truncate font-medium text-white">{channel.name}</div><div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{channel.id.slice(0, 8)}</div></div></div></TableCell><TableCell><Badge variant="outline">{categoryLabel(channel.category)}</Badge></TableCell><TableCell><code className="rounded-[12px] border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300">/{channel.slug}</code></TableCell><TableCell>{channel.originHlsUrl ? <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200">Configurée</Badge> : <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-200">Manquante</Badge>}</TableCell><TableCell>{channel.active ? <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" title="Actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={() => startEdit(channel)}><Edit3 className="size-4" />Modifier</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => void onToggle(channel)}><Power className="size-4" />{channel.active ? "Désactiver" : "Activer"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}
          </TableBody>
        </Table>
      </DataTableShell>

      <Sheet open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) { setEditing(null); setForm(EMPTY_FORM); setFormError(""); setStatsError(""); } }}>
        <SheetContent side="right" className="w-full max-w-[760px] sm:max-w-[760px]">
          <div className="border-b border-white/10 p-6">
            <SheetHeader className="space-y-4 p-0">
              <div className="flex items-start justify-between gap-4">
                <div><SheetTitle>{editing ? "Modifier la chaîne" : "Créer une chaîne"}</SheetTitle><SheetDescription>Nom, slug, origine HLS et lecture des indicateurs OTT quand la chaîne existe déjà.</SheetDescription></div>
                <Badge variant={form.active ? "secondary" : "outline"}>{form.active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="flex items-center gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4"><Avatar className="size-14 rounded-[20px] border border-white/10 bg-white/[0.04]"><AvatarImage src={form.logo || ""} className="object-cover" /><AvatarFallback className="rounded-[20px] bg-white/[0.06] text-sm font-semibold text-slate-300">{(form.name || "TV").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{form.name?.trim() || "Nom de la chaîne"}</p><p className="mt-1 text-xs text-slate-400"><span className="font-mono text-slate-300">{form.slug?.trim() ? `/${form.slug}` : "/slug"}</span><span className="mx-2 text-slate-600">|</span><span>{String(form.category || "Autre")}</span></p></div></div>
            </SheetHeader>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Nom</Label><Input value={form.name || ""} onChange={(event) => { const name = event.target.value; setForm((prev) => ({ ...prev, name, slug: !editing && (!prev.slug || prev.slug.trim() === "") ? slugify(name) : prev.slug })); }} placeholder="Ex: Oniix Sports 1" /></div>
              <div className="space-y-2"><Label>Catégorie</Label><Select value={(form.category as string | undefined) || "Autre"} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as Category }))}><SelectTrigger className="w-full"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger><SelectContent>{CATS.map((category) => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><div className="flex items-center justify-between"><Label>Slug</Label><Button type="button" variant="ghost" size="sm" onClick={() => setForm((prev) => ({ ...prev, slug: slugify(prev.name || "") }))}>Générer</Button></div><Input value={form.slug || ""} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} placeholder="oniix-sports-1" /></div>
              <div className="space-y-2"><Label>Logo</Label><Input value={form.logo || ""} onChange={(event) => setForm((prev) => ({ ...prev, logo: event.target.value }))} placeholder="https://cdn.example.com/logo.png" /></div>
            </section>

            <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-white">Distribution OTT</p><p className="mt-1 text-sm text-slate-400">URL HLS d’origine éditeur. La lecture publique passe ensuite par la gateway.</p></div><Badge variant="outline">Playback</Badge></div>
              <div className="mt-4 space-y-2"><Label>Origine HLS</Label><Input value={form.originHlsUrl || ""} onChange={(event) => setForm((prev) => ({ ...prev, originHlsUrl: event.target.value }))} placeholder="https://origin.example/live/master.m3u8" /></div>
              <div className="mt-4 flex items-center justify-between rounded-[18px] border border-white/8 bg-black/10 px-4 py-3"><div><p className="text-sm font-medium text-white">Publication</p><p className="mt-1 text-xs text-slate-400">Activez la chaîne quand l’origine et le branding sont validés.</p></div><Button type="button" variant="outline" onClick={() => setForm((prev) => ({ ...prev, active: !Boolean(prev.active) }))}>{form.active ? "Désactiver" : "Activer"}</Button></div>
            </section>

            {editing ? <section className="space-y-4">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-white">Observabilité OTT</p><p className="mt-1 text-sm text-slate-400">KPIs quasi temps réel et santé de diffusion pour cette chaîne.</p></div><Button variant="outline" size="sm" onClick={() => void loadChannelStats(editing.id)}><RefreshCw className={cn("size-4", isStatsLoading && "animate-spin")} />Actualiser</Button></div>
              {statsError ? <div className="rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{statsError}</div> : null}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"><div className="flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Actifs</p><Radio className="size-4 text-slate-400" /></div><p className="mt-3 text-2xl font-semibold text-white">{isStatsLoading && !editingStats ? "..." : editingStats ? editingStats.activeViewers : "--"}</p><p className="mt-2 text-xs text-slate-400">Lectures actives</p></div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"><div className="flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Sessions</p><Activity className="size-4 text-slate-400" /></div><p className="mt-3 text-2xl font-semibold text-white">{isStatsLoading && !editingStats ? "..." : editingStats ? editingStats.sessionsToday : "--"}</p><p className="mt-2 text-xs text-slate-400">Demarrages du jour</p></div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"><div className="flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Visionnage</p><Tv className="size-4 text-slate-400" /></div><p className="mt-3 text-2xl font-semibold text-white">{isStatsLoading && !editingStats ? "..." : editingStats ? `${editingStats.watchMinutesToday} min` : "--"}</p><p className="mt-2 text-xs text-slate-400">Temps cumule</p></div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"><div className="flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Buffer</p><AlertTriangle className="size-4 text-slate-400" /></div><p className="mt-3 text-2xl font-semibold text-white">{isStatsLoading && !editingStats ? "..." : editingStats ? pct(editingStats.bufferRatio) : "--"}</p><p className="mt-2 text-xs text-slate-400">Ratio buffer / watch</p></div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">Santé du flux</p><p className="mt-1 text-sm text-slate-400">Codes HTTP master, media et segment.</p></div><Health status={editingStats?.health.status ?? null} /></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-[18px] border border-white/8 bg-black/10 p-4"><p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Master</p><p className="mt-2 text-xl font-semibold text-white">{editingStats?.health.masterPlaylistHttpCode ?? "--"}</p></div><div className="rounded-[18px] border border-white/8 bg-black/10 p-4"><p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Media</p><p className="mt-2 text-xl font-semibold text-white">{editingStats?.health.mediaPlaylistHttpCode ?? "--"}</p></div><div className="rounded-[18px] border border-white/8 bg-black/10 p-4"><p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Segment</p><p className="mt-2 text-xl font-semibold text-white">{editingStats?.health.segmentHttpCode ?? "--"}</p></div></div><p className="mt-4 text-sm leading-6 text-slate-400">{editingStats?.health.message || "Aucun contrôle de santé disponible pour le moment."}</p></div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">Dernières minutes</p><p className="mt-1 text-sm text-slate-400">Buckets minute par minute.</p></div><Badge variant="outline">{editingStats ? editingStats.errorsToday : "--"} erreur(s)</Badge></div><div className="mt-4 space-y-2">{editingStats?.lastMinutes?.length ? editingStats.lastMinutes.slice(-5).map((point) => <div key={point.bucketMinute} className="grid grid-cols-[70px_1fr] items-center gap-3 rounded-[18px] border border-white/8 bg-black/10 px-4 py-3"><div className="text-xs font-mono text-slate-500">{minute(point.bucketMinute)}</div><div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-4"><span>{point.activeViewers} viewers</span><span>{point.sessionsStarted} sessions</span><span>{point.watchSeconds}s watch</span><span>{point.errorCount} erreurs</span></div></div>) : <div className="rounded-[18px] border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">Pas encore de buckets minute pour cette chaîne.</div>}</div></div>
            </section> : null}

            {formError ? <div className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{formError}</div> : null}
          </div>

          <SheetFooter className="border-t border-white/10 p-6 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => void save()} disabled={busy || !form.name?.trim()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}Enregistrer</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}

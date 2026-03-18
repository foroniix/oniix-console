"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  type Category,
  Channel,
  type ChannelRealtimeStats,
  getChannelRealtimeStats,
  listChannels,
  toggleChannel,
  upsertChannel,
} from "@/lib/data";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  Link2,
  MoreHorizontal,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Search,
  Tv,
  XCircle
} from "lucide-react";

const CATS = [
  "Actualité",
  "Sports",
  "Music",
  "Religion",
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
type OriginFilter = "ALL" | "CONFIGURED" | "MISSING";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatMinuteBucket(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChannelsPage() {
  const [rows, setRows] = useState<Channel[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statsByChannel, setStatsByChannel] = useState<Record<string, ChannelRealtimeStats>>({});
  const [statsLoadingId, setStatsLoadingId] = useState<string | null>(null);
  const [statsError, setStatsError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("ALL");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("ALL");

  const [editing, setEditing] = useState<Channel | null>(null);
  const [form, setForm] = useState<Partial<Channel>>({
    name: "",
    slug: "",
    category: "Autre",
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
    const withOrigin = rows.filter((c) => Boolean(c.originHlsUrl?.trim())).length;
    const missingOrigin = total - withOrigin;
    return { total, active, inactive, categories, withOrigin, missingOrigin };
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

      const hasOrigin = Boolean(row.originHlsUrl?.trim());
      const matchesOrigin =
        originFilter === "ALL" ||
        (originFilter === "CONFIGURED" && hasOrigin) ||
        (originFilter === "MISSING" && !hasOrigin);

      return matchesSearch && matchesCat && matchesActive && matchesOrigin;
    });
  }, [rows, searchQuery, catFilter, activeFilter, originFilter]);

  const startCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      slug: "",
      category: "Autre",
      active: true,
      logo: "",
      originHlsUrl: ""
    });
    setStatsError("");
    setOpen(true);
  };

  const loadChannelStats = async (channelId: string) => {
    setStatsLoadingId(channelId);
    setStatsError("");
    try {
      const stats = await getChannelRealtimeStats(channelId, { minutes: 5 });
      setStatsByChannel((prev) => ({ ...prev, [channelId]: stats }));
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : "Impossible de charger les stats OTT.");
    } finally {
      setStatsLoadingId((current) => (current === channelId ? null : current));
    }
  };

  const startEdit = (c: Channel) => {
    setEditing(c);
    setForm({ ...c });
    void loadChannelStats(c.id);
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
    } catch {
      setRows((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, active: !newValue } : x))
      );
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
    <div className="console-page">
      <div className="mx-auto max-w-[1240px] space-y-6">
        {/* Top bar */}
        <div className="console-hero sticky top-0 z-30 -mx-4 px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="text-slate-600 dark:text-slate-300">Console</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-slate-600 dark:text-slate-300">Catalogue</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-slate-950 dark:text-white">Chaînes TV</span>
              </div>

              <div className="mt-2 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.05]">
                  <Tv className="h-5 w-5 text-primary" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white sm:text-xl">
                    Chaînes TV
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Catalogue éditorial, identité visuelle et santé de diffusion.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
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
                    className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_0_1px_rgba(99,102,241,0.30),0_12px_28px_rgba(79,70,229,0.18)]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle chaîne
                  </Button>
                </SheetTrigger>

                {/* Sheet */}
                <SheetContent
                  side="right"
                  className={cn(
                    "border-l border-slate-200 bg-white p-0 text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white",
                    "w-[520px] max-w-[95vw] sm:max-w-[520px]",
                    "h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden"
                  )}
                >
                  {/* Compact header */}
                  <div className="shrink-0 border-b border-slate-200 px-5 pb-4 pt-5 dark:border-white/10 sm:px-6">
                    <SheetHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <SheetTitle className="text-base font-semibold tracking-tight">
                            {editing ? "Modifier la chaîne" : "Créer une chaîne"}
                          </SheetTitle>
                          <SheetDescription className="text-slate-500 dark:text-slate-400">
                            Renseignez les informations essentielles.
                          </SheetDescription>
                        </div>

                        {form.active ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200 shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Minimal preview row */}
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
                        <Avatar className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.05]">
                          <AvatarImage src={form.logo || ""} className="object-cover" />
                          <AvatarFallback className="rounded-xl bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-white/[0.08] dark:text-slate-400">
                            {(form.name || "TV").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-950 dark:text-white">
                            {form.name?.trim() ? form.name : "Nom de la chaîne"}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono text-slate-700 dark:text-slate-200">
                              {form.slug?.trim() ? `/${form.slug}` : "—"}
                            </span>
                            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                            <span>{String(form.category || "Autre")}</span>
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
                          onClick={() =>
                            setForm((f) => ({ ...f, active: !Boolean(f.active) }))
                          }
                        >
                          {form.active ? "Désactiver" : "Activer"}
                        </Button>
                      </div>
                    </SheetHeader>
                  </div>

                  {/* Body (scroll) */}
                  <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-6 space-y-6">
                    {/* Identity */}
                    <section className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">Identité</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Nom, catégorie, slug.
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-slate-700 dark:text-slate-300">Nom</Label>
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
                          className="console-field h-9"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-slate-700 dark:text-slate-300">Catégorie</Label>
                          <Select
                            value={(form.category as Category | undefined) || "Autre"}
                            onValueChange={(v) =>
                              setForm((f) => ({ ...f, category: v as Category }))
                            }
                          >
                            <SelectTrigger className="console-field h-9">
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
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
                            <Label className="text-slate-700 dark:text-slate-300">Slug</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
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
                            className="console-field h-9 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </section>

                    {/* Visual */}
                    <section className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">Logo</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          PNG/SVG carré recommandé.
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-slate-700 dark:text-slate-300">URL du logo</Label>
                        <Input
                          placeholder="https://…"
                          value={form.logo || ""}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, logo: e.target.value }))
                          }
                          className="console-field h-9"
                        />
                      </div>
                    </section>

                    <section className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">Distribution OTT</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          URL HLS d’origine éditeur. La lecture passe ensuite par la gateway Oniix.
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-slate-700 dark:text-slate-300">URL HLS d’origine</Label>
                          <span className="inline-flex items-center gap-2 text-[11px] text-zinc-500">
                            <Link2 className="h-3.5 w-3.5" />
                            Gateway Oniix requise
                          </span>
                        </div>
                        <Input
                          placeholder="https://origin.example/live/master.m3u8"
                          value={form.originHlsUrl || ""}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, originHlsUrl: e.target.value }))
                          }
                          className="console-field h-9 font-mono text-xs"
                        />
                      </div>
                    </section>

                    {editing ? (
                      <section className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950 dark:text-white">Observabilité OTT</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              KPIs quasi temps réel et santé de diffusion pour cette chaîne.
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void loadChannelStats(editing.id)}
                            className="h-8 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
                          >
                            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isStatsLoading && "animate-spin")} />
                            Actualiser
                          </Button>
                        </div>

                        {statsError ? (
                          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            {statsError}
                          </div>
                        ) : null}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <MiniMetricCard
                            title="Spectateurs actifs"
                            value={editingStats ? String(editingStats.activeViewers) : "—"}
                            hint="Lecture active maintenant"
                            icon={Radio}
                          />
                          <MiniMetricCard
                            title="Sessions aujourd’hui"
                            value={editingStats ? String(editingStats.sessionsToday) : "—"}
                            hint="Démarrages du jour"
                            icon={Activity}
                          />
                          <MiniMetricCard
                            title="Temps de visionnage"
                            value={editingStats ? `${editingStats.watchMinutesToday} min` : "—"}
                            hint="Temps de visionnage"
                            icon={Clock3}
                          />
                          <MiniMetricCard
                            title="Taux de buffer"
                            value={editingStats ? formatPercent(editingStats.bufferRatio) : "—"}
                            hint="Temps de buffer / visionnage"
                            icon={AlertTriangle}
                          />
                        </div>

                        <div className="console-panel-muted space-y-3 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-950 dark:text-white">Santé du flux</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Codes HTTP master / media / segment.
                              </p>
                            </div>
                            <HealthBadge status={editingStats?.health.status ?? null} />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Master</p>
                              <p className="mt-1 text-slate-950 dark:text-white">
                                {editingStats?.health.masterPlaylistHttpCode ?? "—"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Media</p>
                              <p className="mt-1 text-slate-950 dark:text-white">
                                {editingStats?.health.mediaPlaylistHttpCode ?? "—"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Segment</p>
                              <p className="mt-1 text-slate-950 dark:text-white">
                                {editingStats?.health.segmentHttpCode ?? "—"}
                              </p>
                            </div>
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {editingStats?.health.message || "Aucun contrôle de santé disponible pour le moment."}
                          </div>
                        </div>

                        <div className="console-panel-muted space-y-3 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-950 dark:text-white">5 dernières minutes</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Buckets minute par minute.
                              </p>
                            </div>
                            <Badge className="border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200">
                              {editingStats ? editingStats.errorsToday : "—"} erreurs aujourd’hui
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {editingStats?.lastMinutes?.length ? (
                              editingStats.lastMinutes.slice(-5).map((point) => (
                                <div
                                  key={point.bucketMinute}
                                  className="grid grid-cols-[64px_1fr] items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]"
                                >
                                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                    {formatMinuteBucket(point.bucketMinute)}
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <span className="text-zinc-200">{point.activeViewers} en direct</span>
                                    <span className="text-slate-700 dark:text-slate-300">{point.sessionsStarted} sessions</span>
                                    <span className="text-slate-700 dark:text-slate-300">{point.watchSeconds}s watch</span>
                                    <span className="text-slate-700 dark:text-slate-300">{point.errorCount} erreurs</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
                                Pas encore de buckets minute pour cette chaîne.
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    ) : null}

                    {editing ? (
                      <div className="console-panel-muted p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          ID{" "}
                          <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                          <span className="font-mono text-slate-700 dark:text-slate-200">
                            {editing.id}
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Footer */}
                  <div className="shrink-0 border-t border-slate-200 px-5 py-4 dark:border-white/10 sm:px-6">
                    <SheetFooter className="gap-2">
                      <Button
                        onClick={() => setOpen(false)}
                        variant="outline"
                        className="h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={save}
                        disabled={busy || !form.name?.trim()}
                        className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px]"
                      >
                        {busy ? (
                          <span className="inline-flex items-center">
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Enregistrement…
                          </span>
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Chaînes" value={stats.total} tone="neutral" badgeLabel="Catalogue" hint="Volume total de chaînes configurées" />
          <StatCard title="Actives" value={stats.active} tone="success" badgeLabel="Diffusion" hint="Chaînes actuellement publiées" />
          <StatCard title="Inactives" value={stats.inactive} tone="muted" badgeLabel="Contrôle" hint="Chaînes en attente de remise en service" />
          <StatCard title="Origines prêtes" value={stats.withOrigin} tone="indigo" badgeLabel="Distribution" hint="Chaînes prêtes pour le playback signé" />
        </div>

        {stats.missingOrigin > 0 ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {stats.missingOrigin} chaîne(s) n&apos;ont pas encore d&apos;URL HLS d&apos;origine. Tant que ce point n&apos;est pas configuré,
            la résolution de lecture mobile échouera et la gateway Oniix ne pourra pas servir le flux.
          </div>
        ) : null}

        {/* Table */}
        <div className="console-toolbar overflow-hidden">
          {/* Toolbar */}
          <div className="border-b border-slate-200/80 p-4 dark:border-white/10 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Rechercher par nom ou slug…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="console-field h-9 pl-9"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Select value={catFilter} onValueChange={setCatFilter}>
                  <SelectTrigger className="console-field h-9 w-full sm:w-[220px]">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                    <SelectItem value="ALL">Toutes catégories</SelectItem>
                    {CATS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={originFilter} onValueChange={(value) => setOriginFilter(value as OriginFilter)}>
                  <SelectTrigger className="console-field h-9 w-full sm:w-[220px]">
                    <SelectValue placeholder="Origine HLS" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                    <SelectItem value="ALL">Toutes origines</SelectItem>
                    <SelectItem value="CONFIGURED">Origine configurée</SelectItem>
                    <SelectItem value="MISSING">Origine manquante</SelectItem>
                  </SelectContent>
                </Select>

                <div className="inline-flex rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-white/[0.04]">
                  <SegBtn
                    active={activeFilter === "ALL"}
                    onClick={() => setActiveFilter("ALL")}
                  >
                    Tous
                  </SegBtn>
                  <SegBtn
                    active={activeFilter === "ACTIVE"}
                    onClick={() => setActiveFilter("ACTIVE")}
                  >
                    Actives
                  </SegBtn>
                  <SegBtn
                    active={activeFilter === "INACTIVE"}
                    onClick={() => setActiveFilter("INACTIVE")}
                  >
                    Inactives
                  </SegBtn>
                </div>

                <Button
                  variant="outline"
                  className="h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
                  onClick={resetFilters}
                >
                  Réinitialiser
                </Button>

                <Badge className="inline-flex h-9 items-center border border-slate-200 bg-white px-3 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                  {filteredRows.length} résultat{filteredRows.length > 1 ? "s" : ""}
                </Badge>
                {stats.missingOrigin > 0 ? (
                  <Badge className="h-9 px-3 bg-amber-500/10 border border-amber-500/20 text-amber-100 inline-flex items-center">
                    {stats.missingOrigin} origine(s) manquante(s)
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-h-[520px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-50/90 dark:bg-white/[0.03]">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="pl-6 text-slate-500 dark:text-slate-400">Chaîne</TableHead>
                  <TableHead className="text-slate-500 dark:text-slate-400">Catégorie</TableHead>
                  <TableHead className="text-slate-500 dark:text-slate-400">Slug</TableHead>
                  <TableHead className="text-slate-500 dark:text-slate-400">Origine HLS</TableHead>
                  <TableHead className="text-slate-500 dark:text-slate-400">Statut</TableHead>
                  <TableHead className="pr-6 text-right text-slate-500 dark:text-slate-400">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <LoadingRows />
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-52 text-center">
                      <div className="mx-auto max-w-md space-y-2">
                        <p className="text-sm font-medium text-zinc-200">
                          Aucun résultat
                        </p>
                        <p className="text-sm text-zinc-500">
                          Ajustez la recherche, ou créez une nouvelle chaîne.
                        </p>
                        <div className="pt-2">
                          <Button
                            onClick={startCreate}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Créer une chaîne
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((c) => (
                    <TableRow
                      key={c.id}
                      className="border-slate-200/80 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.05]">
                            <AvatarImage src={c.logo || ""} className="object-cover" />
                            <AvatarFallback className="rounded-xl text-xs font-semibold text-zinc-500">
                              {c.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-950 dark:text-white">
                              {c.name}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {c.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className="border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200">
                          {c.category}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <code className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200">
                          /{c.slug}
                        </code>
                      </TableCell>

                      <TableCell>
                        {c.originHlsUrl ? (
                          <span className="inline-flex items-center gap-2 text-sm text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" />
                            Configurée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-sm text-amber-300">
                            <AlertTriangle className="h-4 w-4" />
                            Manquante
                          </span>
                        )}
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
                              className="h-9 w-9 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            align="end"
                            className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white"
                          >
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />

                            <DropdownMenuItem
                              onClick={() => startEdit(c)}
                              className="cursor-pointer focus:bg-slate-100 dark:focus:bg-white/[0.08]"
                            >
                              <Edit3 className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => onToggle(c)}
                              className="cursor-pointer focus:bg-slate-100 dark:focus:bg-white/[0.08]"
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

/* UI helpers */

function StatCard({
  title,
  value,
  tone,
  badgeLabel,
  hint,
}: {
  title: string;
  value: number;
  tone: "neutral" | "success" | "muted" | "indigo";
  badgeLabel: string;
  hint: string;
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-100"
      : tone === "muted"
      ? "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
      : tone === "indigo"
      ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-100"
      : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200";

  return (
    <div className="console-panel p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">{title}</p>
        <span className={cn("text-xs px-2 py-1 rounded-full border", toneClasses)}>
          {badgeLabel}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
        {value}
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function MiniMetricCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="console-panel-muted px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{title}</p>
        <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function HealthBadge({ status }: { status: "ok" | "degraded" | "down" | null }) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        OK
      </span>
    );
  }

  if (status === "degraded") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
        <AlertTriangle className="h-3.5 w-3.5" />
        Dégradé
      </span>
    );
  }

  if (status === "down") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
        <XCircle className="h-3.5 w-3.5" />
        Indisponible
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
      <Clock3 className="h-3.5 w-3.5" />
      Non contrôlé
    </span>
  );
}

function SegBtn({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 px-3 rounded-lg text-xs transition",
        active
          ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i} className="border-slate-200/80 dark:border-white/10">
          <TableCell className="pl-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-40 bg-white/5 rounded animate-pulse" />
                <div className="h-2 w-20 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="h-6 w-28 bg-white/5 rounded animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-6 w-36 bg-white/5 rounded animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-6 w-24 bg-white/5 rounded animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-6 w-24 bg-white/5 rounded animate-pulse" />
          </TableCell>
          <TableCell className="text-right pr-6">
            <div className="ml-auto h-9 w-9 bg-white/5 rounded animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

/* utils */

function slugify(input: string) {
  return (input || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

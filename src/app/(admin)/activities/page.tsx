"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  CalendarClock,
  Clapperboard,
  Filter,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Tv2,
  UserCog,
} from "lucide-react";

import { DataTableShell } from "@/components/console/data-table-shell";
import { FilterBar } from "@/components/console/filter-bar";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildInitials } from "@/lib/console-branding";
import { listActivities, type Activity } from "@/lib/data";
import { cn } from "@/lib/utils";

const ALL_VALUE = "__all__";
const TARGET_ICONS = {
  stream: RadioTower,
  program_slot: CalendarClock,
  program: Tv2,
  replay: Clapperboard,
  user: UserCog,
  member: UserCog,
  invite: UserCog,
  fallback: ShieldCheck,
} as const;

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getTargetIconKey(targetType: string) {
  const normalized = normalizeValue(targetType);
  if (normalized.includes("stream")) return "stream";
  if (normalized.includes("program_slot")) return "program_slot";
  if (normalized.includes("program")) return "program";
  if (normalized.includes("replay")) return "replay";
  if (normalized.includes("user")) return "user";
  if (normalized.includes("member")) return "member";
  if (normalized.includes("invite")) return "invite";
  return "fallback";
}

function getActionTone(action: string) {
  const normalized = normalizeValue(action);
  if (normalized.includes("delete") || normalized.includes("remove")) {
    return "border-rose-400/18 bg-rose-500/10 text-rose-200";
  }
  if (normalized.includes("publish")) {
    return "border-emerald-400/18 bg-emerald-500/10 text-emerald-200";
  }
  if (normalized.includes("create") || normalized.includes("invite")) {
    return "border-sky-400/18 bg-sky-500/10 text-sky-200";
  }
  if (normalized.includes("start")) {
    return "border-indigo-400/18 bg-indigo-500/10 text-indigo-200";
  }
  return "border-white/10 bg-white/[0.05] text-slate-300";
}

function formatActionLabel(action: string) {
  return action
    .split(".")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" - ");
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const targetIconKey = getTargetIconKey(activity.targetType);
  const TargetIcon = TARGET_ICONS[targetIconKey];

  return (
    <article className="border-b border-white/8 px-5 py-4 last:border-b-0">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="size-11 border border-white/10 bg-white/[0.04]">
            {activity.actorAvatarUrl ? (
              <AvatarImage src={activity.actorAvatarUrl} alt={activity.actorName ?? "Acteur"} />
            ) : null}
            <AvatarFallback className="bg-white/[0.06] text-slate-200">
              {buildInitials(activity.actorName, activity.actorUserId)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{activity.title}</p>
              <Badge className={cn("border", getActionTone(activity.action))}>{formatActionLabel(activity.action)}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-300">
              {activity.description || "Opération enregistrée dans le journal d’audit."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <TargetIcon className="size-3.5" />
                {activity.targetType}
              </span>
              {activity.targetId ? <span>ID {activity.targetId}</span> : null}
              <span>Acteur {activity.actorName || activity.actorUserId || "Système"}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-left text-xs text-slate-500 xl:text-right">
          <div className="font-medium text-slate-200">{formatTimeLabel(activity.createdAt)}</div>
          <div className="mt-1">{formatDateLabel(activity.createdAt)}</div>
        </div>
      </div>
    </article>
  );
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [targetFilter, setTargetFilter] = useState(ALL_VALUE);
  const [actionFilter, setActionFilter] = useState(ALL_VALUE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listActivities({ page: 1, pageSize: 200 });
      setActivities(rows);
    } catch (loadError) {
      console.error(loadError);
      setActivities([]);
      setError("Impossible de charger le journal d’audit.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const targetOptions = useMemo(
    () => [...new Set(activities.map((item) => item.targetType).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")),
    [activities]
  );

  const actionOptions = useMemo(
    () => [...new Set(activities.map((item) => item.action).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")),
    [activities]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((activity) => {
      if (targetFilter !== ALL_VALUE && activity.targetType !== targetFilter) return false;
      if (actionFilter !== ALL_VALUE && activity.action !== actionFilter) return false;

      if (!q) return true;
      const haystack = [
        activity.title,
        activity.description,
        activity.targetType,
        activity.targetId,
        activity.actorName,
        activity.actorUserId,
        activity.action,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [actionFilter, activities, search, targetFilter]);

  const todayCount = useMemo(() => filtered.filter((activity) => isToday(activity.createdAt)).length, [filtered]);
  const distinctTargets = useMemo(
    () => new Set(filtered.map((activity) => `${activity.targetType}:${activity.targetId ?? "none"}`)).size,
    [filtered]
  );

  const resetFilters = () => {
    setSearch("");
    setTargetFilter(ALL_VALUE);
    setActionFilter(ALL_VALUE);
  };

  return (
    <PageShell>
      <PageHeader
        title="Activités"
        subtitle="Journal d’audit des actions opérateur."
        breadcrumbs={[{ label: "Oniix Console", href: "/dashboard" }, { label: "Activités" }]}
        icon={<ActivityIcon className="size-5" />}
        actions={
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        }
      />

      <KpiRow>
        <KpiCard label="Opérations visibles" value={filtered.length} hint="Journal filtré dans la vue courante." icon={<ActivityIcon className="size-4" />} loading={loading} />
        <KpiCard label="Aujourd’hui" value={todayCount} hint="Actions enregistrées depuis minuit." tone="info" icon={<CalendarClock className="size-4" />} loading={loading} />
        <KpiCard label="Objets touchés" value={distinctTargets} hint="Cibles distinctes présentes dans l’historique." tone="warning" icon={<ShieldCheck className="size-4" />} loading={loading} />
        <KpiCard label="Filtres actifs" value={`${targetFilter !== ALL_VALUE || actionFilter !== ALL_VALUE || search ? "Oui" : "Non"}`} hint="Recherche, type de cible et action." icon={<Filter className="size-4" />} loading={loading} />
      </KpiRow>

      <FilterBar
        onReset={resetFilters}
        resetDisabled={!search && targetFilter === ALL_VALUE && actionFilter === ALL_VALUE}
      >
        <div className="min-w-[220px] flex-1">
          <Label htmlFor="activity-search" className="sr-only">
            Recherche
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="activity-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Programme, action, cible, acteur..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-w-[220px]">
          <Label htmlFor="activity-target" className="sr-only">
            Type de cible
          </Label>
          <Select value={targetFilter} onValueChange={setTargetFilter}>
            <SelectTrigger id="activity-target" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Toutes les cibles</SelectItem>
              {targetOptions.map((target) => (
                <SelectItem key={target} value={target}>
                  {target}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[220px]">
          <Label htmlFor="activity-action" className="sr-only">
            Action
          </Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger id="activity-action" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Toutes les actions</SelectItem>
              {actionOptions.map((action) => (
                <SelectItem key={action} value={action}>
                  {formatActionLabel(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      <DataTableShell
        title="Journal d’audit"
        description="Vue consolidée des opérations applicatives détectées dans la console."
        loading={loading}
        error={error}
        onRetry={() => void load()}
        isEmpty={!loading && !error && filtered.length === 0}
        emptyTitle="Aucune activité"
        emptyDescription="Aucune entrée ne correspond aux filtres sélectionnés."
      >
        <div className="border-b border-white/8 px-5 py-3 text-xs text-slate-500">
          Vue basée sur les logs d’audit applicatifs, sans reconstruction partielle depuis les streams.
        </div>
        <div>
          {filtered.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      </DataTableShell>
    </PageShell>
  );
}

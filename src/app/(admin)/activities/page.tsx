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

import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
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
  SelectValue,
} from "@/components/ui/select";
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
    return "border-rose-400/20 bg-rose-500/10 text-rose-200";
  }
  if (normalized.includes("publish")) {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  }
  if (normalized.includes("create") || normalized.includes("invite")) {
    return "border-sky-400/20 bg-sky-500/10 text-sky-200";
  }
  if (normalized.includes("start")) {
    return "border-indigo-400/20 bg-indigo-500/10 text-indigo-200";
  }
  return "border-[#223249] bg-[rgba(255,255,255,0.04)] text-slate-200";
}

function formatActionLabel(action: string) {
  return action
    .split(".")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" · ");
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

function SummaryCard(props: { label: string; value: string; hint: string }) {
  return (
    <div className="console-panel p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{props.value}</div>
      <div className="mt-1 text-sm text-slate-400">{props.hint}</div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const targetIconKey = getTargetIconKey(activity.targetType);
  const TargetIcon = TARGET_ICONS[targetIconKey];

  return (
    <div className="rounded-[24px] border border-[#223249] bg-[rgba(10,18,30,0.76)] p-4 shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="size-11 border border-[#223249]">
            {activity.actorAvatarUrl ? (
              <AvatarImage src={activity.actorAvatarUrl} alt={activity.actorName ?? "Acteur"} />
            ) : null}
            <AvatarFallback className="bg-[#10203d] text-[#7cb4ff]">
              {buildInitials(activity.actorName, activity.actorUserId)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{activity.title}</p>
              <Badge className={cn("border", getActionTone(activity.action))}>
                {formatActionLabel(activity.action)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-300">
              {activity.description || "Opération enregistrée dans le journal d’audit."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <TargetIcon className="size-3.5 text-slate-500" />
                {activity.targetType}
              </span>
              {activity.targetId ? <span>ID: {activity.targetId}</span> : null}
              <span>Acteur: {activity.actorName || activity.actorUserId || "Système"}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-left text-xs text-slate-400 lg:text-right">
          <div className="font-medium text-slate-200">{formatTimeLabel(activity.createdAt)}</div>
          <div className="mt-1">{formatDateLabel(activity.createdAt)}</div>
        </div>
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [targetFilter, setTargetFilter] = useState(ALL_VALUE);
  const [actionFilter, setActionFilter] = useState(ALL_VALUE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listActivities({ page: 1, pageSize: 200 });
      setActivities(rows);
    } catch (error) {
      console.error(error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const targetOptions = useMemo(
    () =>
      [...new Set(activities.map((item) => item.targetType).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [activities]
  );

  const actionOptions = useMemo(
    () =>
      [...new Set(activities.map((item) => item.action).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
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

  const todayCount = useMemo(
    () => filtered.filter((activity) => isToday(activity.createdAt)).length,
    [filtered]
  );

  const distinctTargets = useMemo(
    () => new Set(filtered.map((activity) => `${activity.targetType}:${activity.targetId ?? "none"}`)).size,
    [filtered]
  );

  return (
    <PageShell>
      <PageHeader
        title="Activités"
        subtitle="Journal d’audit complet des opérations menées dans la console, avec acteurs, cibles et horodatage."
        breadcrumbs={[
          { label: "Oniix Console", href: "/dashboard" },
          { label: "Activités" },
        ]}
        icon={<ActivityIcon className="size-5" />}
        actions={
          <Button
            variant="outline"
            onClick={() => void load()}
            className="h-9 border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-100 hover:bg-white/6"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Opérations chargées" value={String(filtered.length)} hint="Journal filtré dans la vue actuelle" />
        <SummaryCard label="Aujourd’hui" value={String(todayCount)} hint="Actions enregistrées depuis minuit" />
        <SummaryCard label="Objets touchés" value={String(distinctTargets)} hint="Cibles distinctes dans l’historique visible" />
      </div>

      <div className="console-panel p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div className="grid gap-2">
            <Label>Recherche</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Programme, action, cible, acteur..."
                className="console-field pl-9"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Type de cible</Label>
            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#223249] bg-[#0d1726] text-white">
                <SelectItem value={ALL_VALUE}>Toutes les cibles</SelectItem>
                {targetOptions.map((target) => (
                  <SelectItem key={target} value={target}>
                    {target}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#223249] bg-[#0d1726] text-white">
                <SelectItem value={ALL_VALUE}>Toutes les actions</SelectItem>
                {actionOptions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {formatActionLabel(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Filter className="size-3.5 text-slate-500" />
          Vue basée sur les logs d’audit applicatifs, plus sur une reconstruction partielle à partir des streams.
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="console-panel p-6 text-sm text-slate-400">Chargement du journal d’audit...</div>
        ) : filtered.length === 0 ? (
          <div className="console-panel p-6 text-sm text-slate-400">
            Aucune activité ne correspond aux filtres sélectionnés.
          </div>
        ) : (
          filtered.map((activity) => <ActivityRow key={activity.id} activity={activity} />)
        )}
      </div>
    </PageShell>
  );
}

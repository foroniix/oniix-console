import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import type { Channel, ProgramSlot } from "@/lib/data";
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
import { buildProgrammingGrid } from "../grid";
import { formatDateTime } from "../mappers";

const ALL_CHANNELS = "__all_channels__";
const HOUR_STEP_MS = 3_600_000;
const LABEL_WIDTH = 180;

type GridSectionProps = {
  loading: boolean;
  channels: Channel[];
  slots: ProgramSlot[];
  onEditSlot?: (slot: ProgramSlot) => void;
};

function getTodayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function parseDateInput(input: string) {
  const parsed = new Date(`${input}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  return parsed;
}

function statusColor(status: ProgramSlot["slotStatus"], visibility: ProgramSlot["visibility"]) {
  if (status === "cancelled") return "border-rose-400/40 bg-rose-500/20 text-rose-100";
  if (visibility === "private") return "border-slate-300/80 bg-slate-200/80 text-slate-700 dark:border-slate-500/40 dark:bg-slate-800/70 dark:text-slate-200";
  if (status === "published") return "border-emerald-400/40 bg-emerald-500/25 text-emerald-100";
  return "border-indigo-400/40 bg-indigo-500/25 text-indigo-100";
}

export function GridSection(props: GridSectionProps) {
  const { loading, channels, slots, onEditSlot } = props;

  const [dateValue, setDateValue] = useState(getTodayInputValue);
  const [hoursValue, setHoursValue] = useState("24");
  const [channelFilter, setChannelFilter] = useState(ALL_CHANNELS);
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [statusMode, setStatusMode] = useState<"active" | "published" | "all">("active");
  const [nowMs, setNowMs] = useState(() => new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(new Date().getTime()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const slotMap = useMemo(() => new Map(slots.map((slot) => [slot.id, slot])), [slots]);

  const windowModel = useMemo(() => {
    const start = parseDateInput(dateValue);
    const hours = Number(hoursValue);
    const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 24;
    const end = new Date(start.getTime() + safeHours * HOUR_STEP_MS);
    return {
      startMs: start.getTime(),
      endMs: end.getTime(),
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      hours: safeHours,
    };
  }, [dateValue, hoursValue]);

  const statusFilter = useMemo(() => {
    if (statusMode === "published") return ["published"] as ProgramSlot["slotStatus"][];
    if (statusMode === "all") return ["scheduled", "published", "cancelled"] as ProgramSlot["slotStatus"][];
    return ["scheduled", "published"] as ProgramSlot["slotStatus"][];
  }, [statusMode]);

  const lanes = useMemo(
    () =>
      buildProgrammingGrid({
        slots,
        channels,
        windowStart: windowModel.startIso,
        windowEnd: windowModel.endIso,
        channelId: channelFilter === ALL_CHANNELS ? null : channelFilter,
        statusFilter,
        visibilityFilter,
      }),
    [channels, channelFilter, slots, statusFilter, visibilityFilter, windowModel.endIso, windowModel.startIso]
  );

  const nowVisible = nowMs >= windowModel.startMs && nowMs <= windowModel.endMs;
  const windowDurationMs = windowModel.endMs - windowModel.startMs;
  const nowPercent = nowVisible ? ((nowMs - windowModel.startMs) / windowDurationMs) * 100 : 0;

  const timelineWidth = Math.max(920, windowModel.hours * 120);

  const ticks = useMemo(() => {
    const values: Array<{ key: string; label: string; offsetPercent: number }> = [];
    for (let index = 0; index <= windowModel.hours; index += 1) {
      const ms = windowModel.startMs + index * HOUR_STEP_MS;
      const date = new Date(ms);
      values.push({
        key: `${ms}`,
        label: date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        offsetPercent: (index / windowModel.hours) * 100,
      });
    }
    return values;
  }, [windowModel.hours, windowModel.startMs]);

  return (
    <div className="space-y-4">
      <div className="console-panel-muted p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="grid gap-2">
            <Label>Jour</Label>
            <Input
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              className="console-field"
            />
          </div>

          <div className="grid gap-2">
            <Label>Horizon</Label>
            <Select value={hoursValue} onValueChange={setHoursValue}>
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                <SelectItem value="6">6h</SelectItem>
                <SelectItem value="12">12h</SelectItem>
                <SelectItem value="24">24h</SelectItem>
                <SelectItem value="48">48h</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Chaîne</Label>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                <SelectItem value={ALL_CHANNELS}>Toutes</SelectItem>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Statut</Label>
            <Select value={statusMode} onValueChange={(value) => setStatusMode(value as typeof statusMode)}>
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                <SelectItem value="active">Planifiés + publiés</SelectItem>
                <SelectItem value="published">Publiés uniquement</SelectItem>
                <SelectItem value="all">Tous les statuts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Visibilité</Label>
            <Select
              value={visibilityFilter}
              onValueChange={(value) => setVisibilityFilter(value as typeof visibilityFilter)}
            >
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Privé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            Fenêtre: {formatDateTime(windowModel.startIso)} - {formatDateTime(windowModel.endIso)}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDateValue(getTodayInputValue())}
            className="h-8 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
          >
            <Clock3 className="h-3.5 w-3.5 mr-2" />
            Aujourd&apos;hui
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[22px] border border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.02]">
        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">Chargement de la grille...</div>
        ) : lanes.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">Aucun slot dans cette fenêtre.</div>
        ) : (
          <div className="min-w-[980px]" style={{ width: LABEL_WIDTH + timelineWidth }}>
            <div className="flex border-b border-slate-200/80 bg-slate-50/90 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="shrink-0 px-3 py-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400" style={{ width: LABEL_WIDTH }}>
                Chaîne
              </div>
              <div className="relative shrink-0 h-10" style={{ width: timelineWidth }}>
                {ticks.map((tick) => (
                  <div
                    key={tick.key}
                    className="absolute bottom-0 top-0 border-l border-slate-200/80 dark:border-white/5"
                    style={{ left: `${tick.offsetPercent}%` }}
                  >
                    <span className="absolute left-1.5 top-2 text-[10px] text-slate-500 dark:text-slate-400">{tick.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {lanes.map((lane) => (
              <div key={lane.channelId ?? "no-channel"} className="flex border-t border-slate-200/80 dark:border-white/10">
                <div
                  className="shrink-0 border-r border-slate-200/80 bg-slate-50/70 px-3 py-3 text-sm dark:border-white/10 dark:bg-white/[0.03]"
                  style={{ width: LABEL_WIDTH }}
                >
                  <div className="font-medium text-slate-950 dark:text-white">{lane.channelName}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{lane.entries.length} slot(s)</div>
                </div>

                <div className="relative shrink-0 h-24" style={{ width: timelineWidth }}>
                  {ticks.map((tick) => (
                    <div
                      key={`grid-${lane.channelId}-${tick.key}`}
                      className="absolute bottom-0 top-0 border-l border-slate-200/70 dark:border-white/5"
                      style={{ left: `${tick.offsetPercent}%` }}
                    />
                  ))}

                  {nowVisible ? (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-amber-300/80 z-20"
                      style={{ left: `${nowPercent}%` }}
                    />
                  ) : null}

                  {lane.entries.map((entry) => {
                    const leftPercent =
                      ((entry.renderStartMs - windowModel.startMs) / windowDurationMs) * 100;
                    const widthPercent =
                      ((entry.renderEndMs - entry.renderStartMs) / windowDurationMs) * 100;

                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          const slot = slotMap.get(entry.id);
                          if (slot) onEditSlot?.(slot);
                        }}
                        className={`absolute top-3 h-16 overflow-hidden rounded-xl border px-2 text-left transition-colors hover:brightness-105 ${statusColor(
                          entry.slotStatus,
                          entry.visibility
                        )}`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${Math.max(widthPercent, 0.75)}%`,
                        }}
                      >
                        <div className="truncate text-xs font-semibold leading-tight">{entry.title}</div>
                        <div className="mt-1 text-[10px] opacity-80 leading-tight">
                          {formatDateTime(entry.startsAt)} - {formatDateTime(entry.endsAt)}
                        </div>
                        <div className="mt-1">
                          <Badge className="text-[10px] px-1.5 py-0">
                            {entry.slotStatus}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

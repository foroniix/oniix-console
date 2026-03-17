import { useMemo } from "react";
import { Plus } from "lucide-react";
import type { Channel, Replay, Stream } from "@/lib/data";
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
import { formatDateTime } from "../mappers";
import { canTransitionReplayStatus } from "../transitions";
import {
  NONE_VALUE,
  type ReplayFormState,
} from "../types";

type ReplaySectionProps = {
  loading: boolean;
  channels: Channel[];
  streams: Stream[];
  replays: Replay[];
  form: ReplayFormState;
  statusOptions: ReplayFormState["status"][];
  saving: boolean;
  processingQueue: boolean;
  busyAction: string | null;
  onPatch: (patch: Partial<ReplayFormState>) => void;
  onSave: () => void;
  onProcessQueue: () => void;
  onReset: () => void;
  onEdit: (replay: Replay) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
};

function statusTone(status: Replay["replayStatus"]) {
  if (status === "published") return "bg-emerald-600 text-white";
  if (status === "ready") return "bg-blue-600 text-white";
  if (status === "processing") return "bg-amber-500 text-black";
  if (status === "archived") return "bg-zinc-600 text-white";
  return "bg-zinc-700 text-white";
}

function shorten(value: string, max = 90) {
  const raw = value.trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1)}...`;
}

export function ReplaySection(props: ReplaySectionProps) {
  const {
    loading,
    channels,
    streams,
    replays,
    form,
    statusOptions,
    saving,
    processingQueue,
    busyAction,
    onPatch,
    onSave,
    onProcessQueue,
    onReset,
    onEdit,
    onPublish,
    onDelete,
  } = props;

  const streamMap = useMemo(() => new Map(streams.map((stream) => [stream.id, stream.title])), [streams]);

  return (
    <div className="space-y-4">
      <div className="console-panel-muted p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2 grid gap-2">
            <Label>Titre replay</Label>
            <Input
              value={form.title}
              onChange={(e) => onPatch({ title: e.target.value })}
              placeholder="Ex: Replay JT 20h"
              className="console-field"
            />
          </div>

          <div className="sm:col-span-2 grid gap-2">
            <Label>HLS URL</Label>
            <Input
              value={form.hlsUrl}
              onChange={(e) => onPatch({ hlsUrl: e.target.value })}
              placeholder="https://...m3u8"
              className="console-field"
            />
          </div>

          <div className="grid gap-2">
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={(status) => onPatch({ status: status as ReplayFormState["status"] })}>
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Flux source</Label>
            <Select value={form.streamId} onValueChange={(streamId) => onPatch({ streamId })}>
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                <SelectItem value={NONE_VALUE}>Aucune</SelectItem>
                {streams.map((stream) => (
                  <SelectItem key={stream.id} value={stream.id}>
                    {stream.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Chaîne</Label>
            <Select value={form.channelId} onValueChange={(channelId) => onPatch({ channelId })}>
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#0f1724] dark:text-white">
                <SelectItem value={NONE_VALUE}>Aucune</SelectItem>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Poster URL</Label>
            <Input
              value={form.poster}
              onChange={(e) => onPatch({ poster: e.target.value })}
              placeholder="https://..."
              className="console-field"
            />
          </div>

          <div className="grid gap-2">
            <Label>Durée (sec)</Label>
            <Input
              type="number"
              min={0}
              value={form.durationSec}
              onChange={(e) => onPatch({ durationSec: e.target.value })}
              className="console-field"
            />
          </div>

          <div className="sm:col-span-2 grid gap-2">
            <Label>Disponible à partir de</Label>
            <Input
              type="datetime-local"
              value={form.availableFrom}
              onChange={(e) => onPatch({ availableFrom: e.target.value })}
              className="console-field"
            />
          </div>

          <div className="sm:col-span-2 grid gap-2">
            <Label>Disponible jusqu’à</Label>
            <Input
              type="datetime-local"
              value={form.availableTo}
              onChange={(e) => onPatch({ availableTo: e.target.value })}
              className="console-field"
            />
          </div>

          <div className="sm:col-span-6 grid gap-2">
            <Label>Synopsis</Label>
            <Input
              value={form.synopsis}
              onChange={(e) => onPatch({ synopsis: e.target.value })}
              placeholder="Résumé du replay"
              className="console-field"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            onClick={onSave}
            disabled={saving || !form.title.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {saving ? "Enregistrement..." : form.id ? "Mettre à jour le replay" : "Ajouter le replay"}
          </Button>
          <Button
            variant="outline"
            onClick={onProcessQueue}
            disabled={processingQueue}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
          >
            {processingQueue ? "Traitement..." : "Traiter clips en attente"}
          </Button>
          {form.id ? (
            <Button
              variant="outline"
              onClick={onReset}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
            >
              Annuler l’édition
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[22px] border border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.02]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/90 text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
            <tr>
              <th className="text-left px-3 py-2">Replay</th>
              <th className="text-left px-3 py-2">Source</th>
              <th className="text-left px-3 py-2">Chaîne</th>
              <th className="text-left px-3 py-2">HLS / Fenêtre</th>
              <th className="text-left px-3 py-2">Disponibilité</th>
              <th className="text-left px-3 py-2">Statut / Diagnostic</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={7}>
                  Chargement...
                </td>
              </tr>
            ) : replays.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-slate-500 dark:text-slate-400" colSpan={7}>
                  Aucun replay
                </td>
              </tr>
            ) : (
              replays.map((replay) => (
                <tr key={replay.id} className="border-t border-slate-200/80 dark:border-white/10">
                  <td className="px-3 py-2">{replay.title}</td>
                  <td className="px-3 py-2">
                    {replay.stream?.title || (replay.streamId ? streamMap.get(replay.streamId) : null) || "-"}
                  </td>
                  <td className="px-3 py-2">{replay.channel?.name || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-700 dark:text-slate-200">{replay.hlsUrl ? shorten(replay.hlsUrl, 72) : "-"}</div>
                      {replay.clipStartAt || replay.clipEndAt ? (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDateTime(replay.clipStartAt)} {"->"} {formatDateTime(replay.clipEndAt)}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {formatDateTime(replay.availableFrom)}
                    {replay.availableTo ? ` -> ${formatDateTime(replay.availableTo)}` : ""}
                  </td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <Badge className={statusTone(replay.replayStatus)}>{replay.replayStatus}</Badge>
                      {replay.processingError ? (
                        <div className="text-[11px] text-rose-300">{shorten(replay.processingError, 110)}</div>
                      ) : replay.replayStatus === "processing" ? (
                        <div className="text-[11px] text-amber-600 dark:text-amber-300">Génération en cours...</div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(replay)}
                      className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
                    >
                      Éditer
                    </Button>
                    {canTransitionReplayStatus(replay.replayStatus, "published") &&
                    replay.replayStatus !== "published" ? (
                      <Button
                        size="sm"
                        onClick={() => onPublish(replay.id)}
                        disabled={busyAction === `replay:${replay.id}:publish`}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        Publier
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Supprimer ce replay ?")) onDelete(replay.id);
                      }}
                      disabled={busyAction === `replay:${replay.id}:delete`}
                      className="border-rose-400/20 bg-rose-500/10 text-rose-200"
                    >
                      Supprimer
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

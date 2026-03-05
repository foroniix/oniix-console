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
      <div className="rounded-xl border border-white/10 p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2 grid gap-2">
            <Label>Titre replay</Label>
            <Input
              value={form.title}
              onChange={(e) => onPatch({ title: e.target.value })}
              placeholder="Ex: Replay JT 20h"
              className="bg-zinc-950/40 border-white/10"
            />
          </div>

          <div className="sm:col-span-2 grid gap-2">
            <Label>HLS URL</Label>
            <Input
              value={form.hlsUrl}
              onChange={(e) => onPatch({ hlsUrl: e.target.value })}
              placeholder="https://...m3u8"
              className="bg-zinc-950/40 border-white/10"
            />
          </div>

          <div className="grid gap-2">
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={(status) => onPatch({ status: status as ReplayFormState["status"] })}>
              <SelectTrigger className="bg-zinc-950/40 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-zinc-100">
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Source stream</Label>
            <Select value={form.streamId} onValueChange={(streamId) => onPatch({ streamId })}>
              <SelectTrigger className="bg-zinc-950/40 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-zinc-100">
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
            <Label>Chaine</Label>
            <Select value={form.channelId} onValueChange={(channelId) => onPatch({ channelId })}>
              <SelectTrigger className="bg-zinc-950/40 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-zinc-100">
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
              className="bg-zinc-950/40 border-white/10"
            />
          </div>

          <div className="grid gap-2">
            <Label>Duree (sec)</Label>
            <Input
              type="number"
              min={0}
              value={form.durationSec}
              onChange={(e) => onPatch({ durationSec: e.target.value })}
              className="bg-zinc-950/40 border-white/10"
            />
          </div>

          <div className="sm:col-span-2 grid gap-2">
            <Label>Disponible a partir de</Label>
            <Input
              type="datetime-local"
              value={form.availableFrom}
              onChange={(e) => onPatch({ availableFrom: e.target.value })}
              className="bg-zinc-950/40 border-white/10"
            />
          </div>

          <div className="sm:col-span-2 grid gap-2">
            <Label>Disponible jusqua</Label>
            <Input
              type="datetime-local"
              value={form.availableTo}
              onChange={(e) => onPatch({ availableTo: e.target.value })}
              className="bg-zinc-950/40 border-white/10"
            />
          </div>

          <div className="sm:col-span-6 grid gap-2">
            <Label>Synopsis</Label>
            <Input
              value={form.synopsis}
              onChange={(e) => onPatch({ synopsis: e.target.value })}
              placeholder="Resume du replay"
              className="bg-zinc-950/40 border-white/10"
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
            {saving ? "Enregistrement..." : form.id ? "Mettre a jour replay" : "Ajouter replay"}
          </Button>
          <Button
            variant="outline"
            onClick={onProcessQueue}
            disabled={processingQueue}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
          >
            {processingQueue ? "Traitement..." : "Traiter clips en attente"}
          </Button>
          {form.id ? (
            <Button
              variant="outline"
              onClick={onReset}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
            >
              Annuler edition
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/40 text-zinc-400">
            <tr>
              <th className="text-left px-3 py-2">Replay</th>
              <th className="text-left px-3 py-2">Source</th>
              <th className="text-left px-3 py-2">Chaine</th>
              <th className="text-left px-3 py-2">HLS / Fenetre</th>
              <th className="text-left px-3 py-2">Disponibilite</th>
              <th className="text-left px-3 py-2">Statut / Diagnostic</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3 text-zinc-500" colSpan={7}>
                  Chargement...
                </td>
              </tr>
            ) : replays.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-zinc-500" colSpan={7}>
                  Aucun replay
                </td>
              </tr>
            ) : (
              replays.map((replay) => (
                <tr key={replay.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{replay.title}</td>
                  <td className="px-3 py-2">
                    {replay.stream?.title || (replay.streamId ? streamMap.get(replay.streamId) : null) || "-"}
                  </td>
                  <td className="px-3 py-2">{replay.channel?.name || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-xs text-zinc-200">{replay.hlsUrl ? shorten(replay.hlsUrl, 72) : "-"}</div>
                      {replay.clipStartAt || replay.clipEndAt ? (
                        <div className="text-[11px] text-zinc-500">
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
                        <div className="text-[11px] text-amber-300">Generation en cours...</div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(replay)}
                      className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
                    >
                      Editer
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

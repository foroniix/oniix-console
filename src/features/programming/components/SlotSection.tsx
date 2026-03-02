import { useMemo } from "react";
import { Plus } from "lucide-react";
import type { Channel, Program, ProgramSlot } from "@/lib/data";
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
import { canTransitionSlotStatus } from "../transitions";
import {
  NONE_VALUE,
  SLOT_VISIBILITY_VALUES,
  type SlotFormState,
} from "../types";

type SlotSectionProps = {
  loading: boolean;
  programs: Program[];
  channels: Channel[];
  slots: ProgramSlot[];
  form: SlotFormState;
  statusOptions: SlotFormState["status"][];
  saving: boolean;
  busyAction: string | null;
  onPatch: (patch: Partial<SlotFormState>) => void;
  onSave: () => void;
  onReset: () => void;
  onEdit: (slot: ProgramSlot) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
};

export function SlotSection(props: SlotSectionProps) {
  const {
    loading,
    programs,
    channels,
    slots,
    form,
    statusOptions,
    saving,
    busyAction,
    onPatch,
    onSave,
    onReset,
    onEdit,
    onPublish,
    onDelete,
  } = props;

  const programMap = useMemo(() => new Map(programs.map((p) => [p.id, p.title])), [programs]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="grid gap-2">
            <Label>Programme</Label>
            <Select value={form.programId} onValueChange={(programId) => onPatch({ programId })}>
              <SelectTrigger className="bg-zinc-950/40 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-zinc-100">
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Debut</Label>
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => onPatch({ startsAt: e.target.value })}
              className="bg-zinc-950/40 border-white/10"
            />
          </div>

          <div className="grid gap-2">
            <Label>Fin</Label>
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => onPatch({ endsAt: e.target.value })}
              className="bg-zinc-950/40 border-white/10"
            />
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
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={(status) => onPatch({ status: status as SlotFormState["status"] })}>
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
            <Label>Visibilite</Label>
            <Select
              value={form.visibility}
              onValueChange={(visibility) =>
                onPatch({ visibility: visibility as SlotFormState["visibility"] })
              }
            >
              <SelectTrigger className="bg-zinc-950/40 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-zinc-100">
                {SLOT_VISIBILITY_VALUES.map((visibility) => (
                  <SelectItem key={visibility} value={visibility}>
                    {visibility}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-6 grid gap-2">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => onPatch({ notes: e.target.value })}
              placeholder="Notes de diffusion"
              className="bg-zinc-950/40 border-white/10"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            onClick={onSave}
            disabled={saving || !form.programId || !form.startsAt}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {saving ? "Enregistrement..." : form.id ? "Mettre a jour slot" : "Ajouter slot"}
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
              <th className="text-left px-3 py-2">Programme</th>
              <th className="text-left px-3 py-2">Chaine</th>
              <th className="text-left px-3 py-2">Debut</th>
              <th className="text-left px-3 py-2">Fin</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3 text-zinc-500" colSpan={6}>
                  Chargement...
                </td>
              </tr>
            ) : slots.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-zinc-500" colSpan={6}>
                  Aucun slot
                </td>
              </tr>
            ) : (
              slots.map((slot) => (
                <tr key={slot.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{programMap.get(slot.programId) || "-"}</td>
                  <td className="px-3 py-2">{slot.channel?.name || "-"}</td>
                  <td className="px-3 py-2">{formatDateTime(slot.startsAt)}</td>
                  <td className="px-3 py-2">{formatDateTime(slot.endsAt)}</td>
                  <td className="px-3 py-2">
                    <Badge>{slot.slotStatus}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(slot)}
                      className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
                    >
                      Editer
                    </Button>
                    {canTransitionSlotStatus(slot.slotStatus, "published") &&
                    slot.slotStatus !== "published" ? (
                      <Button
                        size="sm"
                        onClick={() => onPublish(slot.id)}
                        disabled={busyAction === `slot:${slot.id}:publish`}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        Publier
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Supprimer ce slot ?")) onDelete(slot.id);
                      }}
                      disabled={busyAction === `slot:${slot.id}:delete`}
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

import { useMemo } from "react";
import { Plus } from "lucide-react";

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
import type { Channel, Program, ProgramSlot } from "@/lib/data";
import { formatDateTime } from "../mappers";
import { canTransitionSlotStatus } from "../transitions";
import { NONE_VALUE, SLOT_VISIBILITY_VALUES, type SlotFormState } from "../types";

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

  const programMap = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs]);

  return (
    <div className="space-y-4">
      <div className="console-panel-muted p-3 sm:p-4">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-white">Planificateur de diffusion</h2>
          <p className="text-sm text-slate-400">
            Une diffusion TV doit toujours être rattachée à une chaîne avec un début et une fin. La grille publique et
            l’EPG mobile s’appuient sur ces slots.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-6">
          <div className="grid gap-2">
            <Label>Programme</Label>
            <Select
              value={form.programId}
              onValueChange={(programId) => {
                const program = programMap.get(programId);
                onPatch({
                  programId,
                  channelId: program?.channelId || NONE_VALUE,
                });
              }}
            >
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#223249] bg-[#0d1726] text-white">
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Début</Label>
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => onPatch({ startsAt: e.target.value })}
              className="console-field"
            />
          </div>

          <div className="grid gap-2">
            <Label>Fin</Label>
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => onPatch({ endsAt: e.target.value })}
              className="console-field"
            />
          </div>

          <div className="grid gap-2">
            <Label>Chaîne</Label>
            <Select value={form.channelId} onValueChange={(channelId) => onPatch({ channelId })}>
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#223249] bg-[#0d1726] text-white">
                <SelectItem value={NONE_VALUE}>Choisir une chaîne</SelectItem>
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
            <Select
              value={form.status}
              onValueChange={(status) => onPatch({ status: status as SlotFormState["status"] })}
            >
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#223249] bg-[#0d1726] text-white">
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Visibilité</Label>
            <Select
              value={form.visibility}
              onValueChange={(visibility) =>
                onPatch({ visibility: visibility as SlotFormState["visibility"] })
              }
            >
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#223249] bg-[#0d1726] text-white">
                {SLOT_VISIBILITY_VALUES.map((visibility) => (
                  <SelectItem key={visibility} value={visibility}>
                    {visibility}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:col-span-6">
            <Label>Notes d’exploitation</Label>
            <Input
              value={form.notes}
              onChange={(e) => onPatch({ notes: e.target.value })}
              placeholder="Informations utiles pour l’équipe antenne"
              className="console-field"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            onClick={onSave}
            disabled={
              saving ||
              !form.programId ||
              !form.startsAt ||
              !form.endsAt ||
              !form.channelId ||
              form.channelId === NONE_VALUE
            }
            className="bg-indigo-600 text-white hover:bg-indigo-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement..." : form.id ? "Mettre à jour la diffusion" : "Planifier la diffusion"}
          </Button>
          {form.id ? (
            <Button
              variant="outline"
              onClick={onReset}
              className="border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-100 hover:bg-white/6"
            >
              Annuler l’édition
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[22px] border border-[#223249] bg-[rgba(10,18,30,0.62)]">
        <table className="w-full text-sm">
          <thead className="bg-[rgba(255,255,255,0.03)] text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Programme</th>
              <th className="px-3 py-2 text-left">Chaîne</th>
              <th className="px-3 py-2 text-left">Début</th>
              <th className="px-3 py-2 text-left">Fin</th>
              <th className="px-3 py-2 text-left">Statut</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3 text-slate-400" colSpan={6}>
                  Chargement...
                </td>
              </tr>
            ) : slots.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-slate-400" colSpan={6}>
                  Aucune diffusion planifiée
                </td>
              </tr>
            ) : (
              slots.map((slot) => (
                <tr key={slot.id} className="border-t border-[#223249]">
                  <td className="px-3 py-2 text-white">{programMap.get(slot.programId)?.title || "-"}</td>
                  <td className="px-3 py-2 text-slate-300">{slot.channel?.name || "-"}</td>
                  <td className="px-3 py-2 text-slate-300">{formatDateTime(slot.startsAt)}</td>
                  <td className="px-3 py-2 text-slate-300">{formatDateTime(slot.endsAt)}</td>
                  <td className="px-3 py-2">
                    <Badge>{slot.slotStatus}</Badge>
                  </td>
                  <td className="space-x-2 px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(slot)}
                      className="border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-100 hover:bg-white/6"
                    >
                      Éditer
                    </Button>
                    {canTransitionSlotStatus(slot.slotStatus, "published") &&
                    slot.slotStatus !== "published" ? (
                      <Button
                        size="sm"
                        onClick={() => onPublish(slot.id)}
                        disabled={busyAction === `slot:${slot.id}:publish`}
                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        Publier
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Supprimer cette diffusion ?")) onDelete(slot.id);
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

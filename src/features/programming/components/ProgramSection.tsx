import { CalendarPlus2, Plus } from "lucide-react";

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
import type { Channel, Program } from "@/lib/data";
import { formatDateTime } from "../mappers";
import { canTransitionProgramStatus } from "../transitions";
import { NONE_VALUE, type ProgramFormState } from "../types";

type ProgramSectionProps = {
  loading: boolean;
  channels: Channel[];
  programs: Program[];
  form: ProgramFormState;
  statusOptions: ProgramFormState["status"][];
  saving: boolean;
  busyAction: string | null;
  onPatch: (patch: Partial<ProgramFormState>) => void;
  onSave: () => void;
  onReset: () => void;
  onEdit: (program: Program) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  onSchedule: (program: Program) => void;
};

export function ProgramSection(props: ProgramSectionProps) {
  const {
    loading,
    channels,
    programs,
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
    onSchedule,
  } = props;

  return (
    <div className="space-y-4">
      <div className="console-panel-muted p-3 sm:p-4">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-white">Catalogue programmes</h2>
          <p className="text-sm text-slate-400">
            Un programme décrit le contenu éditorial. Pour apparaître dans la grille TV, il doit ensuite être planifié
            dans un slot de diffusion.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-6">
          <div className="grid gap-2 sm:col-span-2">
            <Label>Titre du programme</Label>
            <Input
              value={form.title}
              onChange={(e) => onPatch({ title: e.target.value })}
              placeholder="Ex: Prime du soir"
              className="console-field"
            />
          </div>

          <div className="grid gap-2">
            <Label>Chaîne par défaut</Label>
            <Select value={form.channelId} onValueChange={(channelId) => onPatch({ channelId })}>
              <SelectTrigger className="console-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#223249] bg-[#0d1726] text-white">
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
            <Label>Statut du catalogue</Label>
            <Select
              value={form.status}
              onValueChange={(status) => onPatch({ status: status as ProgramFormState["status"] })}
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

          <div className="grid gap-2 sm:col-span-2">
            <Label>Catégorie</Label>
            <Input
              value={form.category}
              onChange={(e) => onPatch({ category: e.target.value })}
              placeholder="Ex : Actualité"
              className="console-field"
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label>Poster URL</Label>
            <Input
              value={form.poster}
              onChange={(e) => onPatch({ poster: e.target.value })}
              placeholder="https://..."
              className="console-field"
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label>Tags</Label>
            <Input
              value={form.tags}
              onChange={(e) => onPatch({ tags: e.target.value })}
              placeholder="sport, prime-time"
              className="console-field"
            />
          </div>

          <div className="grid gap-2 sm:col-span-6">
            <Label>Synopsis</Label>
            <Input
              value={form.synopsis}
              onChange={(e) => onPatch({ synopsis: e.target.value })}
              placeholder="Résumé éditorial"
              className="console-field"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            onClick={onSave}
            disabled={saving || !form.title.trim()}
            className="bg-indigo-600 text-white hover:bg-indigo-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement..." : form.id ? "Mettre à jour le programme" : "Créer le programme"}
          </Button>
          {form.id ? (
            <Button
              variant="outline"
              onClick={onReset}
              className="border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-100 hover:bg-white/6"
            >
              Annuler l&apos;édition
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[22px] border border-[#223249] bg-[rgba(10,18,30,0.62)]">
        <table className="w-full text-sm">
          <thead className="bg-[rgba(255,255,255,0.03)] text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Titre</th>
              <th className="px-3 py-2 text-left">Chaîne</th>
              <th className="px-3 py-2 text-left">Statut</th>
              <th className="px-3 py-2 text-left">Publié</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3 text-slate-400" colSpan={5}>
                  Chargement...
                </td>
              </tr>
            ) : programs.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-slate-400" colSpan={5}>
                  Aucun programme
                </td>
              </tr>
            ) : (
              programs.map((program) => (
                <tr key={program.id} className="border-t border-[#223249]">
                  <td className="px-3 py-2 text-white">{program.title}</td>
                  <td className="px-3 py-2 text-slate-300">{program.channel?.name || "-"}</td>
                  <td className="px-3 py-2">
                    <Badge>{program.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{formatDateTime(program.publishedAt)}</td>
                  <td className="space-x-2 px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSchedule(program)}
                      className="border-sky-400/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20"
                    >
                      <CalendarPlus2 className="mr-2 h-3.5 w-3.5" />
                      Planifier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(program)}
                      className="border-[#223249] bg-[rgba(255,255,255,0.03)] text-slate-100 hover:bg-white/6"
                    >
                      Éditer
                    </Button>
                    {canTransitionProgramStatus(program.status, "published") &&
                    program.status !== "published" ? (
                      <Button
                        size="sm"
                        onClick={() => onPublish(program.id)}
                        disabled={busyAction === `program:${program.id}:publish`}
                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        Publier
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Supprimer ce programme ?")) onDelete(program.id);
                      }}
                      disabled={busyAction === `program:${program.id}:delete`}
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

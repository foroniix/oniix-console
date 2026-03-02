import { Plus } from "lucide-react";
import type { Channel, Program } from "@/lib/data";
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
  } =
    props;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2 grid gap-2">
            <Label>Titre programme</Label>
            <Input
              value={form.title}
              onChange={(e) => onPatch({ title: e.target.value })}
              placeholder="Ex: Prime du soir"
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
            <Select
              value={form.status}
              onValueChange={(status) => onPatch({ status: status as ProgramFormState["status"] })}
            >
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

          <div className="sm:col-span-2 grid gap-2">
            <Label>Categorie</Label>
            <Input
              value={form.category}
              onChange={(e) => onPatch({ category: e.target.value })}
              placeholder="Ex: News"
              className="bg-zinc-950/40 border-white/10"
            />
          </div>

          <div className="sm:col-span-2 grid gap-2">
            <Label>Poster URL</Label>
            <Input
              value={form.poster}
              onChange={(e) => onPatch({ poster: e.target.value })}
              placeholder="https://..."
              className="bg-zinc-950/40 border-white/10"
            />
          </div>

          <div className="sm:col-span-2 grid gap-2">
            <Label>Tags (comma)</Label>
            <Input
              value={form.tags}
              onChange={(e) => onPatch({ tags: e.target.value })}
              placeholder="sport, prime-time"
              className="bg-zinc-950/40 border-white/10"
            />
          </div>

          <div className="sm:col-span-6 grid gap-2">
            <Label>Synopsis</Label>
            <Input
              value={form.synopsis}
              onChange={(e) => onPatch({ synopsis: e.target.value })}
              placeholder="Resume editorial"
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
            {saving ? "Enregistrement..." : form.id ? "Mettre a jour programme" : "Ajouter programme"}
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
              <th className="text-left px-3 py-2">Titre</th>
              <th className="text-left px-3 py-2">Chaine</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Publie</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3 text-zinc-500" colSpan={5}>
                  Chargement...
                </td>
              </tr>
            ) : programs.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-zinc-500" colSpan={5}>
                  Aucun programme
                </td>
              </tr>
            ) : (
              programs.map((program) => (
                <tr key={program.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{program.title}</td>
                  <td className="px-3 py-2">{program.channel?.name || "-"}</td>
                  <td className="px-3 py-2">
                    <Badge>{program.status}</Badge>
                  </td>
                  <td className="px-3 py-2">{formatDateTime(program.publishedAt)}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(program)}
                      className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200"
                    >
                      Editer
                    </Button>
                    {canTransitionProgramStatus(program.status, "published") &&
                    program.status !== "published" ? (
                      <Button
                        size="sm"
                        onClick={() => onPublish(program.id)}
                        disabled={busyAction === `program:${program.id}:publish`}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
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

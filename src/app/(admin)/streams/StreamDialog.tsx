"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertStream, type Channel, type Stream, type StreamStatus } from "@/lib/data";

interface StreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamToEdit?: Stream | null;
  channels: Channel[];
  onSuccess: () => void;
}

type StreamFormState = {
  title: string;
  hlsUrl: string;
  channelId: string;
  status: StreamStatus;
  description: string;
};

const EMPTY_FORM: StreamFormState = {
  title: "",
  hlsUrl: "",
  channelId: "NONE",
  status: "OFFLINE",
  description: "",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Impossible de sauvegarder le flux.";
}

export default function StreamDialog({ open, onOpenChange, streamToEdit, channels, onSuccess }: StreamDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<StreamFormState>(EMPTY_FORM);

  const isEditing = Boolean(streamToEdit);
  const channelOptions = useMemo(() => channels.slice().sort((a, b) => a.name.localeCompare(b.name)), [channels]);

  useEffect(() => {
    if (!open) return;

    if (streamToEdit) {
      setFormData({
        title: streamToEdit.title,
        hlsUrl: streamToEdit.hlsUrl,
        channelId: streamToEdit.channelId || "NONE",
        status: streamToEdit.status,
        description: streamToEdit.description ?? "",
      });
    } else {
      setFormData(EMPTY_FORM);
    }

    setError(null);
    setIsLoading(false);
  }, [open, streamToEdit]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = formData.title.trim();
    const hlsUrl = formData.hlsUrl.trim();
    const description = formData.description.trim();

    if (!title || !hlsUrl) {
      setError("Le titre et la source du flux sont obligatoires.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await upsertStream({
        id: streamToEdit?.id,
        title,
        hlsUrl,
        channelId: formData.channelId === "NONE" ? undefined : formData.channelId,
        status: formData.status,
        description: description || undefined,
      });
      onSuccess();
      onOpenChange(false);
    } catch (submitError) {
      console.error("Stream save error", submitError);
      setError(getErrorMessage(submitError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Mettre à jour le flux" : "Créer un nouveau flux"}</DialogTitle>
          <DialogDescription>
            Renseignez la source, le canal de diffusion et le statut opérateur pour garder la supervision propre.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="stream-title">Titre du flux</Label>
              <Input
                id="stream-title"
                placeholder="Ex: Plateau principal"
                value={formData.title}
                onChange={(event) => {
                  setFormData((current) => ({ ...current, title: event.target.value }));
                  if (error) setError(null);
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stream-channel">Chaîne associée</Label>
              <Select
                value={formData.channelId}
                onValueChange={(value) => {
                  setFormData((current) => ({ ...current, channelId: value }));
                  if (error) setError(null);
                }}
              >
                <SelectTrigger id="stream-channel" className="w-full">
                  <SelectValue placeholder="Sélectionner une chaîne" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Aucune chaîne</SelectItem>
                  {channelOptions.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stream-status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => {
                  setFormData((current) => ({ ...current, status: value as StreamStatus }));
                  if (error) setError(null);
                }}
              >
                <SelectTrigger id="stream-status" className="w-full">
                  <SelectValue placeholder="Choisir un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFLINE">Hors ligne</SelectItem>
                  <SelectItem value="LIVE">En direct</SelectItem>
                  <SelectItem value="ENDED">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="stream-source">URL source</Label>
              <Input
                id="stream-source"
                placeholder="https://cdn.example.com/master.m3u8"
                value={formData.hlsUrl}
                onChange={(event) => {
                  setFormData((current) => ({ ...current, hlsUrl: event.target.value }));
                  if (error) setError(null);
                }}
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="stream-description">Note opérateur</Label>
              <Textarea
                id="stream-description"
                placeholder="Contexte technique, fenêtre de diffusion, contact d'escalade..."
                value={formData.description}
                onChange={(event) => {
                  setFormData((current) => ({ ...current, description: event.target.value }));
                  if (error) setError(null);
                }}
              />
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-3 rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? "Enregistrer" : "Créer le flux"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

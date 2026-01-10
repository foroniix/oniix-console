"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertStream, type Channel, type Stream } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface StreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamToEdit?: Stream | null; // Si null, c'est une création
  channels: Channel[];
  onSuccess: () => void;
}

export default function StreamDialog({ open, onOpenChange, streamToEdit, channels, onSuccess }: StreamDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    hlsUrl: "",
    channelId: "",
    status: "OFFLINE"
  });

  // Remplir le formulaire si on est en mode édition
  useEffect(() => {
    if (streamToEdit) {
      setFormData({
        title: streamToEdit.title,
        hlsUrl: streamToEdit.hlsUrl,
        channelId: streamToEdit.channelId,
        status: streamToEdit.status
      });
    } else {
      // Reset pour création
      setFormData({ title: "", hlsUrl: "", channelId: "", status: "OFFLINE" });
    }
  }, [streamToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await upsertStream({
        id: streamToEdit?.id, // Si présent, c'est un update
        ...formData,
        status: formData.status as any
      });
      onSuccess(); // Recharger la liste
      onOpenChange(false); // Fermer la modale
    } catch (error) {
      console.error("Erreur lors de la sauvegarde", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{streamToEdit ? "Modifier le flux" : "Créer un nouveau flux"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-400">Titre du flux</Label>
            <Input 
              id="title" 
              placeholder="Ex: Caméra Studio 1" 
              className="bg-zinc-900 border-zinc-800 focus:ring-indigo-500"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel" className="text-zinc-400">Chaîne associée</Label>
            <Select 
              value={formData.channelId} 
              onValueChange={(val) => setFormData({...formData, channelId: val})}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Choisir une chaîne..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {channels.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hls" className="text-zinc-400">URL Source (HLS/RTMP)</Label>
            <Input 
              id="hls" 
              placeholder="https://..." 
              className="bg-zinc-900 border-zinc-800 font-mono text-sm"
              value={formData.hlsUrl}
              onChange={(e) => setFormData({...formData, hlsUrl: e.target.value})}
              required
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-zinc-800 text-zinc-400">
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {streamToEdit ? "Sauvegarder" : "Créer le flux"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
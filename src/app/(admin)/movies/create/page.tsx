"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { uploadMediaFile, upsertMediaContent, type ContentType, type SourceType } from "@/lib/data";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Film,
  Info,
  Link as LinkIcon,
  Play,
  Plus,
  Tv,
  Upload
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function CreateContentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ÉTAT DU FORMULAIRE ---
  const [contentType, setContentType] = useState<ContentType>("MOVIE");
  const [sourceType, setSourceType] = useState<SourceType>("UPLOAD");
  const [form, setForm] = useState({
    title: "",
    description: "",
    poster_url: "",
    release_year: new Date().getFullYear(),
    video_url: "", // Utilisé si sourceType === "URL"
  });

  // --- ÉTAT DE L'UPLOAD / SAUVEGARDE ---
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const submit = async (published: boolean) => {
    setError(null);
    if (!form.title.trim()) return setError("Le titre est obligatoire");

    try {
      setIsSaving(true);
      let finalVideoUrl = form.video_url;

      // 1. Gérer l'upload si nécessaire
      if (sourceType === "UPLOAD" && file) {
        finalVideoUrl = await uploadMediaFile(file, (progress) => {
          setUploadProgress(progress);
        });
      } else if (sourceType === "UPLOAD" && !file) {
        return setError("Veuillez sélectionner un fichier vidéo");
      }

      // 2. Enregistrer les métadonnées
      await upsertMediaContent({
        ...form,
        type: contentType,
        video_url: finalVideoUrl,
        published,
        source_type: sourceType,
      });

      router.push("/movies");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* BARRE DE NAVIGATION SUPÉRIEURE */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Nouveau Contenu</h1>
              <p className="text-zinc-500 text-sm">Ajoutez un média au catalogue de la plateforme.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => submit(false)} disabled={isSaving}>
              Brouillon
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => submit(true)} disabled={isSaving}>
              {isSaving ? "En cours..." : "Publier maintenant"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
            <Info className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLONNE GAUCHE : TYPE & POSTER */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6">
              <div>
                <Label className="text-zinc-400 mb-3 block">Type de contenu</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "MOVIE", icon: Film, label: "Film" },
                    { id: "SERIES", icon: Tv, label: "Série" },
                    { id: "MANGA", icon: BookOpen, label: "Manga" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setContentType(t.id as ContentType)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        contentType === t.id 
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-400" 
                        : "bg-black/20 border-white/5 text-zinc-500 hover:border-white/20"
                      }`}
                    >
                      <t.icon className="w-5 h-5 mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-zinc-400 mb-3 block">Affiche (Poster)</Label>
                <div className="aspect-[2/3] w-full bg-black rounded-xl border border-dashed border-white/10 overflow-hidden relative group">
                  {form.poster_url ? (
                    <img src={form.poster_url} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                      <Plus className="w-8 h-8 mb-2 opacity-20" />
                      <span className="text-xs">Aucun aperçu</span>
                    </div>
                  )}
                </div>
                <Input 
                  className="mt-4 bg-zinc-950 border-zinc-800" 
                  placeholder="URL de l'image (https://...)" 
                  value={form.poster_url}
                  onChange={e => setForm({...form, poster_url: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : INFOS & MÉDIA */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Infos de base */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label>Titre original *</Label>
                  <Input 
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="Ex: Interstellar"
                    className="bg-zinc-950 border-zinc-800 h-12 text-lg focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Année de sortie</Label>
                  <Input 
                    type="number"
                    value={form.release_year}
                    onChange={e => setForm({...form, release_year: parseInt(e.target.value)})}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Genres (séparés par virgules)</Label>
                  <Input placeholder="Action, Science-fiction..." className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Synopsis / Description</Label>
                  <Textarea 
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    placeholder="Résumé du contenu..."
                    className="bg-zinc-950 border-zinc-800 min-h-[120px]"
                  />
                </div>
              </div>
            </div>

            {/* Source Média */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Play className="w-5 h-5 text-indigo-500" /> Source Vidéo
                </h3>
                <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                  <TabsList className="bg-zinc-950 border border-white/5">
                    <TabsTrigger value="UPLOAD" className="gap-2">
                      <Upload className="w-3 h-3" /> Fichier
                    </TabsTrigger>
                    <TabsTrigger value="URL" className="gap-2">
                      <LinkIcon className="w-3 h-3" /> Lien Cloud
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {sourceType === "UPLOAD" ? (
                <div className="space-y-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${
                      file ? "border-indigo-500/50 bg-indigo-500/5" : "border-white/10 hover:border-white/20 bg-black/20"
                    }`}
                  >
                    <input type="file" ref={fileInputRef} hidden accept="video/*" onChange={handleFileChange} />
                    {file ? (
                      <>
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                        <span className="text-white font-medium">{file.name}</span>
                        <span className="text-zinc-500 text-xs mt-1">{(file.size / (1024*1024)).toFixed(2)} Mo - Prêt pour l'upload</span>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                          <Upload className="w-6 h-6 text-zinc-400" />
                        </div>
                        <p className="text-sm text-zinc-400">Glissez-déposez ou <span className="text-indigo-400">cliquez pour parcourir</span></p>
                        <p className="text-[10px] text-zinc-600 mt-2">MP4, MKV, MOV (Max 2GB recommandé)</p>
                      </>
                    )}
                  </div>
                  
                  {isSaving && uploadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-indigo-400 font-medium">Upload en cours...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2 bg-zinc-800" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label className="text-zinc-400">URL du flux (HLS ou MP4)</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-600" />
                      <Input 
                        placeholder="https://votre-s3-bucket.com/video.m3u8"
                        value={form.video_url}
                        onChange={e => setForm({...form, video_url: e.target.value})}
                        className="pl-10 bg-zinc-950 border-zinc-800 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 italic">
                    Utilisez ce mode si vos vidéos sont déjà stockées sur un CDN externe (Amazon S3, DigitalOcean, Cloudinary).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
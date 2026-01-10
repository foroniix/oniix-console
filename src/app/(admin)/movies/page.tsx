"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress"; // Assurez-vous d'avoir ce composant shadcn
import {
  Sheet, SheetContent,
  SheetDescription, SheetFooter,
  SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMediaContent,
  listMediaContent,
  uploadMediaFile,
  upsertMediaContent,
  type ContentType,
  type MediaContent
} from "@/lib/data";
import {
  BookOpen,
  Edit3,
  Film, Image as ImageIcon,
  Layers, Loader2,
  MoreVertical,
  Plus, Search, Trash2,
  Tv,
  Upload
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export default function MoviesPage() {
  const [items, setItems] = useState<MediaContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<MediaContent | null>(null);
  const [form, setForm] = useState<Partial<MediaContent>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await listMediaContent();
      setItems(data);
    } catch (e) {
      console.error("Erreur chargement:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === "ALL" || item.type === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [items, search, activeTab]);

  const handleCreate = (type: ContentType = 'MOVIE') => {
    setEditing(null);
    setForm({ 
      title: "", 
      type, 
      published: false, 
      source_type: 'URL', 
      genres: [],
      release_year: new Date().getFullYear() 
    });
    setIsOpen(true);
  };

  const handleEdit = (item: MediaContent) => {
    setEditing(item);
    setForm({ ...item });
    setIsOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadProgress(0);
      const url = await uploadMediaFile(file, (progress) => {
        setUploadProgress(progress);
      });
      setForm(prev => ({ ...prev, video_url: url, source_type: 'UPLOAD' }));
      setUploadProgress(null);
    } catch (error) {
      console.error("Échec de l'upload", error);
      alert("Erreur lors de l'upload du fichier");
      setUploadProgress(null);
    }
  };

  const handleSave = async () => {
    if (!form.title) return;
    setIsSaving(true);
    try {
      await upsertMediaContent({ ...form, id: editing?.id });
      await loadData();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce contenu définitivement ?")) return;
    try {
      await deleteMediaContent(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const getTypeIcon = (type?: ContentType) => {
    switch(type) {
      case 'SERIES': return <Tv className="w-4 h-4" />;
      case 'MANGA': return <BookOpen className="w-4 h-4" />;
      default: return <Film className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-8 space-y-8">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
            Catalogue Media
          </h1>
          <p className="text-zinc-400 mt-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            Gérez vos Films, Séries et Mangas.
          </p>
        </div>
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                    <Plus className="w-4 h-4 mr-2" /> Ajouter du contenu
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white w-48">
                <DropdownMenuItem onClick={() => handleCreate('MOVIE')} className="cursor-pointer">
                    <Film className="mr-2 h-4 w-4" /> Nouveau Film
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreate('SERIES')} className="cursor-pointer">
                    <Tv className="mr-2 h-4 w-4" /> Nouvelle Série
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreate('MANGA')} className="cursor-pointer">
                    <BookOpen className="mr-2 h-4 w-4" /> Nouveau Manga
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/40 p-2 rounded-xl border border-white/5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="bg-transparent">
            <TabsTrigger value="ALL">Tout</TabsTrigger>
            <TabsTrigger value="MOVIE">Films</TabsTrigger>
            <TabsTrigger value="SERIES">Séries</TabsTrigger>
            <TabsTrigger value="MANGA">Mangas</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Rechercher..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-950 border-zinc-800"
          />
        </div>
      </div>

      {/* GRID */}
      {loading ? (
        <div className="flex justify-center py-20 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="group relative bg-zinc-900 border border-white/5 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all shadow-xl">
              <div className="aspect-[2/3] relative">
                {item.poster_url ? (
                  <img src={item.poster_url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600"><ImageIcon /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                <div className="absolute top-2 left-2">
                    <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-[10px]">
                        {getTypeIcon(item.type)} <span className="ml-1">{item.type}</span>
                    </Badge>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/60">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white">
                            <DropdownMenuItem onClick={() => handleEdit(item)}><Edit3 className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-rose-500"><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm truncate">{item.title}</h3>
                <p className="text-[10px] text-zinc-500 mt-1">{item.release_year} • {item.published ? 'Publié' : 'Brouillon'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FORM SHEET */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[550px] bg-[#0c0c0e] text-zinc-100 border-l border-white/10 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-2xl">
                {getTypeIcon(form.type)} {editing ? "Modifier" : "Ajouter"}
            </SheetTitle>
            <SheetDescription>Configurez les métadonnées et la source média.</SheetDescription>
          </SheetHeader>

          <div className="mt-8 space-y-6">
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label>Titre</Label>
                    <Input value={form.title || ""} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="grid gap-2">
                    <Label>Synopsis</Label>
                    <Textarea value={form.description || ""} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="bg-zinc-900 border-zinc-800 min-h-[100px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Année</Label>
                        <Input type="number" value={form.release_year || ""} onChange={e => setForm(f => ({...f, release_year: parseInt(e.target.value)}))} className="bg-zinc-900 border-zinc-800" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Affiche (URL)</Label>
                        <Input value={form.poster_url || ""} onChange={e => setForm(f => ({...f, poster_url: e.target.value}))} className="bg-zinc-900 border-zinc-800" />
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                    <Label className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Source Vidéo</Label>
                    <div className="flex bg-zinc-900 p-1 rounded-md border border-white/5">
                        <Button variant={form.source_type === 'URL' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-[10px]" onClick={() => setForm(f => ({...f, source_type: 'URL'}))}>LIEN CLOUD</Button>
                        <Button variant={form.source_type === 'UPLOAD' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-[10px]" onClick={() => setForm(f => ({...f, source_type: 'UPLOAD'}))}>UPLOAD</Button>
                    </div>
                </div>

                {form.source_type === 'URL' ? (
                    <Input 
                        placeholder="https://votre-stockage.com/film.mp4" 
                        value={form.video_url || ""} 
                        onChange={e => setForm(f => ({...f, video_url: e.target.value}))}
                        className="bg-zinc-900 border-zinc-800"
                    />
                ) : (
                    <div className="space-y-4">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-white/5 cursor-pointer transition-colors"
                        >
                            <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                            <span className="text-sm text-zinc-400">
                                {form.video_url ? "Fichier sélectionné ✅" : "Cliquez pour uploader la vidéo"}
                            </span>
                            <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileUpload} />
                        </div>
                        {uploadProgress !== null && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span>Upload en cours...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <Progress value={uploadProgress} className="h-1 bg-zinc-800" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-zinc-900/50 rounded-lg p-4 flex items-center justify-between border border-white/5">
                <div>
                    <Label className="text-white">Publier</Label>
                    <p className="text-[10px] text-zinc-500">Rendre visible sur l'application.</p>
                </div>
                <Switch checked={!!form.published} onCheckedChange={v => setForm(f => ({...f, published: v}))} />
            </div>
          </div>

          <SheetFooter className="mt-8 border-t border-white/5 pt-6">
            <Button onClick={() => setIsOpen(false)} variant="ghost">Annuler</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.title} className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]">
              {isSaving ? <Loader2 className="animate-spin" /> : "Enregistrer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
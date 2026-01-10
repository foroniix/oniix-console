"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { News, NewsStatus } from "@/lib/data";
import MarkdownIt from "markdown-it";
import { useMemo, useState } from "react";

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

type Props = {
  initial?: Partial<News>;
  onSave: (patch: Partial<News>) => Promise<void>;
  onBack: () => void;
};

export default function MdEditor({ initial, onSave, onBack }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [status, setStatus] = useState<NewsStatus>((initial?.status as any) ?? "DRAFT");
  const [cover, setCover] = useState(initial?.cover ?? "");
  const [scheduledAt, setScheduledAt] = useState<string>(initial?.scheduledAt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [busy, setBusy] = useState(false);

  const html = useMemo(() => ({ __html: md.render(content || "") }), [content]);

  const save = async () => {
    setBusy(true);
    await onSave({ title, slug, status, cover, content, scheduledAt: scheduledAt || null });
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" className="border-white/10 text-zinc-100" onClick={onBack}>Retour</Button>
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy || !title.trim()} className="bg-white/10 hover:bg-white/20">
            {busy ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      <Card className="border-white/10 bg-[#111318]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white">{initial?.id ? "Modifier l’actualité" : "Nouvelle actualité"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Titre…" className="bg-white/5 border-white/10" />
            </div>
            <div className="grid gap-2">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e)=>setSlug(e.target.value)} placeholder="slug-auto" className="bg-white/5 border-white/10" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v)=>setStatus(v as NewsStatus)}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111318] text-zinc-100 border-white/10">
                  {(["DRAFT","PUBLISHED","SCHEDULED"] as NewsStatus[]).map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Programmation (ISO)</Label>
              <Input value={scheduledAt ?? ""} onChange={(e)=>setScheduledAt(e.target.value)} placeholder="2025-12-05T18:00:00Z" className="bg-white/5 border-white/10" />
              <p className="text-xs text-zinc-400">Optionnel. Utilisé si “SCHEDULED”.</p>
            </div>
            <div className="grid gap-2">
              <Label>Cover (URL)</Label>
              <Input value={cover} onChange={(e)=>setCover(e.target.value)} placeholder="https://…" className="bg-white/5 border-white/10" />
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Contenu (Markdown)</Label>
              <textarea
                value={content}
                onChange={(e)=>setContent(e.target.value)}
                rows={18}
                placeholder="Rédigez en **Markdown**…"
                className="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-zinc-100 border border-white/10"
              />
              <p className="text-xs text-zinc-400">Liens, listes, titres… supportés (markdown-it).</p>
            </div>

            <div>
              <Label>Aperçu</Label>
              <div className="mt-2 min-h-[300px] rounded-md border border-white/10 bg-white/5 p-4 prose prose-invert max-w-none"
                   dangerouslySetInnerHTML={html} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listNews, type News, type NewsStatus, removeNews } from "@/lib/data";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STATUS: Record<NewsStatus, string> = {
  DRAFT: "bg-zinc-500/15 text-zinc-300 border border-white/10",
  PUBLISHED: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
  SCHEDULED: "bg-blue-500/15 text-blue-300 border border-blue-400/20",
};

export default function NewsPage() {
  const [rows, setRows] = useState<News[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await listNews();
        setRows(data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((n) =>
      [n.title ?? "", n.slug ?? ""].join(" ").toLowerCase().includes(term)
    );
  }, [rows, q]);

  const del = async (id: string) => {
    await removeNews(id);
    setRows((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">News</h1>
          <p className="text-sm text-zinc-400">Créer, publier et planifier.</p>
        </div>
        <Link href="/news/new">
          <Button className="bg-white/10 hover:bg-white/20">Nouvelle actu</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-zinc-100 border border-white/10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((n) => {
          const ts =
            n.updatedAt ??
            n.updated_at ??
            n.createdAt ??
            n.created_at ??
            new Date().toISOString();

          return (
            <Card key={n.id} className="border-white/10 bg-[#111318]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">{n.title}</CardTitle>
                  <span className={`px-2 py-1 text-xs rounded ${STATUS[n.status]}`}>
                    {n.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">/{n.slug}</div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <div className="text-xs text-zinc-400">
                  MAJ: {new Date(ts).toLocaleString()}
                </div>
                <div className="flex gap-2">
                  <Link href={`/news/${n.id}`}>
                    <Button size="sm" className="bg-white/10 hover:bg-white/20">
                      Modifier
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="bg-red-500/20 hover:bg-red-500/30 border-white/10"
                    onClick={() => del(n.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="border-white/10 bg-[#111318] p-6 text-center text-zinc-400">
            Aucune actu.
          </Card>
        )}
      </div>
    </div>
  );
}

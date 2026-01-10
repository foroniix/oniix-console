// =====================================
// src/app/(admin)/movies/[id]/page.tsx
// Édition d'un film – UI complète
// =====================================

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Movie {
  id: string;
  title: string;
  description?: string;
  poster_url?: string;
  hls_url?: string;
  published: boolean;
}

export default function EditMoviePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/admin/api/movies/${id}`)
      .then((res) => res.json())
      .then((data) => setMovie(data));
  }, [id]);

  if (!movie) {
    return <p className="p-6 text-zinc-400">Chargement du film…</p>;
  }

  const save = async (published: boolean) => {
    setSaving(true);

    await fetch(`/api/movies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...movie, published }),
    });

    router.push("/movies");
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Éditer le film</h1>
          <p className="text-sm text-zinc-400">Modifier les informations du film</p>
        </div>

        {movie.published ? (
          <span className="rounded-md bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
            Publié
          </span>
        ) : (
          <span className="rounded-md bg-yellow-500/20 px-3 py-1 text-xs text-yellow-400">
            Brouillon
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Poster */}
        <div>
          <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border border-white/10 bg-black">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Aucune miniature
              </div>
            )}
          </div>

          <input
            value={movie.poster_url ?? ""}
            onChange={(e) => setMovie({ ...movie, poster_url: e.target.value })}
            placeholder="URL de la miniature"
            className="mt-3 w-full rounded-md border border-white/10 bg-[#0e1116] p-2 text-sm text-white"
          />
        </div>

        {/* Form */}
        <div className="col-span-2 space-y-4">
          <div>
            <label className="text-sm text-zinc-400">Titre</label>
            <input
              value={movie.title}
              onChange={(e) => setMovie({ ...movie, title: e.target.value })}
              className="mt-1 w-full rounded-md border border-white/10 bg-[#0e1116] p-2 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">Description</label>
            <textarea
              value={movie.description ?? ""}
              onChange={(e) => setMovie({ ...movie, description: e.target.value })}
              rows={4}
              className="mt-1 w-full rounded-md border border-white/10 bg-[#0e1116] p-2 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">URL HLS (.m3u8)</label>
            <input
              value={movie.hls_url ?? ""}
              onChange={(e) => setMovie({ ...movie, hls_url: e.target.value })}
              className="mt-1 w-full rounded-md border border-white/10 bg-[#0e1116] p-2 text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {!movie.published && (
              <button
                disabled={saving}
                onClick={() => save(true)}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
              >
                Publier
              </button>
            )}

            {movie.published && (
              <button
                disabled={saving}
                onClick={() => save(false)}
                className="rounded-md border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5"
              >
                Repasser en brouillon
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

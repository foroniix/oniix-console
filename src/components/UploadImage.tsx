"use client";

import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";

export default function UploadImage({
  value, onChange, label = "Miniature (JPEG/PNG)", accept = "image/*",
}: { value?: string; onChange: (url: string) => void; label?: string; accept?: string }) {
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectFile = () => inputRef.current?.click();

  const onFile = async (f: File | null) => {
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      // preview immédiate
      const obj = URL.createObjectURL(f);
      setLocal(obj);
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const ct = res.headers.get("content-type") || "";
      const json = ct.includes("application/json") ? await res.json().catch(() => null) : null;
      if (!res.ok || !json?.url) {
        console.error("Upload failed", { status: res.status });
        throw new Error("Le chargement du fichier est indisponible pour le moment.");
      }
      onChange(json.url);
    } catch {
      setError("Le chargement du fichier est indisponible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-sm text-zinc-200">{label}</div>
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-28 overflow-hidden rounded-md border border-white/10 bg-white/5">
          {local || value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={local || value} alt="thumb" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">Aperçu</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => onFile(e.target.files?.item(0) ?? null)}
          />
          <Button type="button" className="bg-white/10 hover:bg-white/20" onClick={selectFile} disabled={busy}>
            {busy ? "Envoi…" : "Choisir un fichier"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="outline"
              className="border-white/10 text-zinc-100"
              onClick={() => { onChange(""); setLocal(null); }}
              disabled={busy}
            >
              Retirer
            </Button>
          )}
        </div>
      </div>
      <div className="text-xs text-zinc-400">Recommandé: 1280×720, &lt; 1 Mo.</div>
      {error ? <div className="text-xs text-rose-300">{error}</div> : null}
    </div>
  );
}





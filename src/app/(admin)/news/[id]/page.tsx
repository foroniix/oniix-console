"use client";

import { getNews, updateNews, type News } from "@/lib/data";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MdEditor from "../components/MdEditor";

export default function EditNewsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<News | null>(null);

  useEffect(()=>{ (async ()=> { const n = await getNews(id); if (n) setDoc(n); })(); },[id]);

  if (!doc) return <div className="text-zinc-300">Chargement…</div>;

  return (
    <MdEditor
      initial={doc}
      onSave={async (patch) => {
        const saved = await updateNews(doc.id, patch);
        setDoc(saved);
      }}
      onBack={() => router.push("/news")}
    />
  );
}


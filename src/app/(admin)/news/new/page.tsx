"use client";

import { createNews } from "@/lib/data";
import { useRouter } from "next/navigation";
import MdEditor from "../components/MdEditor";

export default function NewNewsPage() {
  const router = useRouter();
  return (
    <MdEditor
      onSave={async (patch) => {
        const saved = await createNews(patch);
        router.replace(`/news/${saved.id}`);
      }}
      onBack={() => router.push("/news")}
    />
  );
}





// ===============================
// src/app/(admin)/series/page.tsx
// ===============================

"use client";

import { useEffect, useState } from "react";

interface Series {
  id: string;
  title: string;
  description?: string;
  poster_url?: string;
  published: boolean;
}

export default function AdminSeriesPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/admin/api/series")
      .then((res) => res.json())
      .then((data) => setSeries(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Chargement des séries...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>📺 Séries</h1>

      <table style={{ width: "100%", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th>Titre</th>
            <th>Publié</th>
          </tr>
        </thead>
        <tbody>
          {series.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>{item.published ? "✅" : "❌"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

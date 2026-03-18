"use client";

import { ArrowRight, Tv2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function WebViewerEntryPage() {
  const router = useRouter();
  const [streamId, setStreamId] = useState("");

  const normalizedStreamId = useMemo(() => streamId.trim(), [streamId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedStreamId) return;
    router.push(`/we/${encodeURIComponent(normalizedStreamId)}`);
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#071222] text-[#f4f7fb]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[#1f8bff]/25 blur-[110px]" />
        <div className="absolute bottom-[-200px] right-[-160px] h-[460px] w-[460px] rounded-full bg-[#00d39b]/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.12),transparent_38%),radial-gradient(circle_at_85%_20%,rgba(0,211,155,0.16),transparent_34%)]" />
      </div>

      <section className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center px-5 py-10 sm:px-8">
        <div className="w-full rounded-[28px] border border-white/15 bg-[#0d1a30]/70 p-6 shadow-[0_40px_120px_-70px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-9">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-[#102343] text-[#9bc7ff]">
              <Tv2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-[var(--font-we-display)] text-lg font-semibold tracking-tight">Visionneuse web Oniix</p>
              <p className="text-sm text-[#a8b7cf]">Accès direct de contrôle et de démonstration</p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
            <div>
              <h1 className="font-[var(--font-we-display)] text-3xl font-semibold leading-tight text-white sm:text-4xl">
                Ouvrez un direct Oniix dans une interface web claire, rapide et alignée sur la console.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#b6c4d9] sm:text-base">
                Saisissez un identifiant de flux pour charger une page de lecture avec direct, bascule de chaîne,
                grille éditoriale et replays.
              </p>
            </div>

            <form onSubmit={submit} className="rounded-2xl border border-white/15 bg-[#0b172d]/85 p-4 sm:p-5">
              <label htmlFor="stream-id" className="text-xs font-medium uppercase tracking-[0.16em] text-[#8fa4c4]">
                Identifiant du flux
              </label>
              <input
                id="stream-id"
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-[#081224] px-4 text-sm text-white outline-none transition focus:border-[#5fa9ff] focus:ring-2 focus:ring-[#5fa9ff]/25"
                autoFocus
              />
              <button
                type="submit"
                disabled={!normalizedStreamId}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1f8bff] px-4 font-medium text-white transition hover:bg-[#1873d6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ouvrir la lecture
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

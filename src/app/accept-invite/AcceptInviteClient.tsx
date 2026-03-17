"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Ticket } from "lucide-react";

import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AcceptInviteClient() {
  const params = useSearchParams();
  const router = useRouter();
  const codeFromUrl = params.get("code") || "";

  const [code, setCode] = useState(codeFromUrl);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => code.trim().length > 10 && !loading, [code, loading]);

  const accept = async () => {
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const res = await fetch("/api/tenant/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Invitation invalide.");

      setMsg("Invitation acceptée. Redirection vers la plateforme...");
      window.setTimeout(() => router.push("/dashboard"), 600);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow="Invitation workspace"
      title="Rejoignez un espace Oniix existant."
      subtitle="Connectez-vous avec l’email invité, puis validez votre code d’invitation pour activer l’accès."
      footer={<p className="text-sm text-slate-600">Après validation, vous serez redirigé vers votre console.</p>}
    >
      <div className="space-y-5">
        {(err || msg) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              err ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {err || msg}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Code d’invitation</label>
          <div className="relative">
            <Ticket className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400"
              placeholder="Collez le code reçu par email"
            />
          </div>
        </div>

        <Button
          onClick={accept}
          disabled={!canSubmit}
          className="h-11 w-full rounded-xl bg-[#4056c8] text-white hover:bg-[#3148be]"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Accepter l’invitation
            </>
          )}
        </Button>
      </div>
    </AuthFrame>
  );
}

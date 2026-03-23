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

      setMsg("Invitation acceptee. Redirection vers la plateforme...");
      window.setTimeout(() => router.push("/dashboard"), 600);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow="Invitation"
      title="Rejoignez un espace existant."
      subtitle="Connectez-vous avec l'email invité puis validez votre code pour activer l'accès."
      footer={<p className="text-sm text-slate-400">Apres validation, vous serez redirige vers votre console.</p>}
    >
      <div className="space-y-5">
        {(err || msg) && (
          <div
            className={`rounded-[20px] border px-4 py-3 text-sm ${
              err ? "border-rose-500/20 bg-rose-500/10 text-rose-100" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            {err || msg}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Code d&apos;invitation</label>
          <div className="relative">
            <Ticket className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="pl-11"
              placeholder="Collez le code recu par email"
            />
          </div>
        </div>

        <Button onClick={accept} disabled={!canSubmit} className="h-11 w-full">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Accepter l&apos;invitation
            </>
          )}
        </Button>
      </div>
    </AuthFrame>
  );
}

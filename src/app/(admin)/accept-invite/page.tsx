"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function AcceptInvitePage() {
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Erreur");

      setMsg("Invite acceptée ✅");
      setTimeout(() => router.push("/"), 500);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-zinc-900/40 border-white/10">
        <CardHeader>
          <CardTitle>Accepter une invitation</CardTitle>
          <CardDescription className="text-zinc-500">
            Connecte-toi avec l’email invité, puis colle le code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(err || msg) && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                err
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              }`}
            >
              {err || msg}
            </div>
          )}

          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bg-zinc-950/50 border-white/10"
            placeholder="Code d'invitation"
          />

          <Button onClick={accept} disabled={!canSubmit} className="bg-indigo-600 hover:bg-indigo-700 w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Accepter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

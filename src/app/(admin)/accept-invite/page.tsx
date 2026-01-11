import { Suspense } from "react";
import AcceptInviteClient from "./AcceptInviteClient";

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
          <div className="text-sm text-zinc-400">Chargement…</div>
        </div>
      }
    >
      <AcceptInviteClient />
    </Suspense>
  );
}

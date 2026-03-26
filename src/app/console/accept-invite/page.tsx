import type { Metadata } from "next";
import { Suspense } from "react";

import AcceptInviteClient from "@/app/accept-invite/AcceptInviteClient";

export const metadata: Metadata = {
  title: "Invitation console | Oniix",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ConsoleAcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[linear-gradient(180deg,#f7fbff,#edf3f8)] p-6">
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">
            Chargement...
          </div>
        </div>
      }
    >
      <AcceptInviteClient />
    </Suspense>
  );
}

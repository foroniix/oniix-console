import Link from "next/link";

const SUPPORT_EMAIL = "support@oniix.space";
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Assistance%20Oniix`;
const SUPPORT_WHATSAPP = "https://wa.me/2290144797213";

export function WebViewerFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="px-4 pb-8 pt-2 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-4 rounded-[28px] border border-white/10 bg-[rgba(5,9,16,0.82)] px-5 py-5 text-sm text-slate-300 shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium text-white">(c) {year} Oniix. Streaming OTT, replay et VOD.</p>
            <p className="mt-1 text-slate-400">Support, cadre legal et parcours public web.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href={SUPPORT_MAILTO} className="transition hover:text-white">
              {SUPPORT_EMAIL}
            </a>
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer" className="transition hover:text-white">
              WhatsApp
            </a>
            <Link href="/support/help" className="transition hover:text-white">
              Aide
            </Link>
            <Link href="/privacy" className="transition hover:text-white">
              Confidentialite
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

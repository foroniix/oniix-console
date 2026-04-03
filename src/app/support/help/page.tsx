import type { Metadata } from "next";
import Link from "next/link";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { ConsoleFooter } from "@/components/legal/console-footer";

export const metadata: Metadata = {
  title: "Support",
  description: "Centre d aide et support Oniix.",
};

const SUPPORT_EMAIL = "support@oniix.space";
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Assistance%20Oniix`;
const SUPPORT_WHATSAPP = "https://wa.me/2290144797213";

const faqs = [
  {
    question: "Pourquoi un direct ne se lance pas ?",
    answer:
      "Verifiez votre connexion, rechargez la session de lecture et controlez que la chaine est bien en direct. Si le probleme persiste, ecrivez au support.",
  },
  {
    question: "Comment recuperer mon compte ?",
    answer:
      "Utilisez l ecran de connexion ou contactez support@oniix.space avec votre adresse d inscription pour qu un conseiller vous aide.",
  },
  {
    question: "Quel canal utiliser en priorite ?",
    answer:
      "Le mail reste le canal principal pour un suivi propre et tracable. WhatsApp reste utile pour les echanges rapides.",
  },
];

export default function SupportHelpPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(64,86,200,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_24%),linear-gradient(180deg,#f7f1ea_0%,#efe6da_100%)]" />
      <div className="relative mx-auto max-w-5xl space-y-6">
        <header className="rounded-[30px] border border-[#d8cdbe] bg-[rgba(248,242,235,0.9)] p-6 shadow-[0_20px_55px_rgba(39,37,33,0.10)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <OniixLogo size="md" subtitle="Support produit" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a7066]">Assistance</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Support Oniix</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#655d53]">
                  Utilisez le mail comme canal principal pour les incidents de lecture, les difficultes d acces ou les
                  demandes liees au compte.
                </p>
              </div>
            </div>
            <Link href="/" className="text-sm font-medium text-[#3549be] hover:text-[#2f40aa]">
              Retour a l accueil
            </Link>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          <a
            href={SUPPORT_MAILTO}
            className="rounded-[24px] border border-[#d8cdbe] bg-[rgba(250,245,238,0.9)] p-5 shadow-sm transition hover:border-[#c4b5a0]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a7066]">Email</p>
            <h2 className="mt-2 text-xl font-semibold">Support prioritaire</h2>
            <p className="mt-3 text-sm leading-7 text-[#655d53]">{SUPPORT_EMAIL}</p>
          </a>
          <a
            href={SUPPORT_WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="rounded-[24px] border border-[#d8cdbe] bg-[rgba(250,245,238,0.9)] p-5 shadow-sm transition hover:border-[#c4b5a0]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a7066]">WhatsApp</p>
            <h2 className="mt-2 text-xl font-semibold">Support conversationnel rapide</h2>
            <p className="mt-3 text-sm leading-7 text-[#655d53]">Disponible pour les echanges courts et l orientation.</p>
          </a>
        </section>

        <section className="grid gap-4">
          {faqs.map((item) => (
            <article
              key={item.question}
              className="rounded-[24px] border border-[#d8cdbe] bg-[rgba(250,245,238,0.82)] p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{item.question}</h2>
              <p className="mt-3 text-sm leading-7 text-[#655d53]">{item.answer}</p>
            </article>
          ))}
        </section>

        <ConsoleFooter />
      </div>
    </main>
  );
}

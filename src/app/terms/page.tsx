import type { Metadata } from "next";
import Link from "next/link";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { ConsoleFooter } from "@/components/legal/console-footer";

export const metadata: Metadata = {
  title: "Conditions",
  description: "Conditions d utilisation publiques de la plateforme Oniix.",
};

const sections = [
  {
    title: "1. Objet du service",
    body: "Oniix donne acces a des experiences de television en direct, de replay et de contenus selectionnes selon les droits accordes a la plateforme.",
  },
  {
    title: "2. Usage autorise",
    body: "Vous vous engagez a utiliser l application et la surface web dans un cadre licite, sans redistribution, reproduction ou contournement des mesures d acces et de securite.",
  },
  {
    title: "3. Compte utilisateur",
    body: "Vous etes responsable de votre session, de vos identifiants et de toute activite realisee depuis votre compte jusqu a fermeture ou signalement au support.",
  },
  {
    title: "4. Offres operateur",
    body: "Certaines offres, dont le pilote Celtiis Benin, reposent sur des conditions operateur, des fenetres de validite et des politiques de sponsoring propres au partenaire.",
  },
  {
    title: "5. Disponibilite du service",
    body: "Oniix fait le maximum pour assurer une diffusion stable, mais certains flux, replays ou integrations partenaires peuvent connaitre des interruptions, maintenances ou restrictions territoriales.",
  },
  {
    title: "6. Contact",
    body: "Pour toute question contractuelle ou operationnelle, contactez contact@oniix.space.",
  },
];

export default function TermsPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(64,86,200,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_24%),linear-gradient(180deg,#f7f1ea_0%,#efe6da_100%)]" />
      <div className="relative mx-auto max-w-5xl space-y-6">
        <header className="rounded-[30px] border border-[#d8cdbe] bg-[rgba(248,242,235,0.9)] p-6 shadow-[0_20px_55px_rgba(39,37,33,0.10)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <OniixLogo size="md" subtitle="Cadre legal produit" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a7066]">Informations legales</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Conditions d utilisation</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#655d53]">
                  Reference web Oniix. Cette page reprend le cadre public de lecture et d usage du service.
                </p>
              </div>
            </div>
            <Link href="/" className="text-sm font-medium text-[#3549be] hover:text-[#2f40aa]">
              Retour a l accueil
            </Link>
          </div>
        </header>

        <section className="grid gap-4">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[24px] border border-[#d8cdbe] bg-[rgba(250,245,238,0.82)] p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#655d53]">{section.body}</p>
            </article>
          ))}
        </section>

        <ConsoleFooter />
      </div>
    </main>
  );
}

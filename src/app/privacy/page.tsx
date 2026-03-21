import type { Metadata } from "next";
import Link from "next/link";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { ConsoleFooter } from "@/components/legal/console-footer";

export const metadata: Metadata = {
  title: "Confidentialite",
  description: "Principes de confidentialite de la plateforme Oniix.",
};

const sections = [
  {
    title: "Donnees de compte",
    body: "Oniix traite les informations necessaires a l'authentification, a la gestion des acces, aux roles, aux invitations et a l'exploitation des espaces editeurs.",
  },
  {
    title: "Donnees d'exploitation",
    body: "La plateforme peut enregistrer des signaux d'activite, des journaux d'audit, des evenements live et des metriques techniques afin d'assurer la supervision des chaines, des flux et de la securite produit.",
  },
  {
    title: "Usage des donnees",
    body: "Les donnees sont utilisees pour exploiter la console, securiser la diffusion, assister les equipes, diagnostiquer les incidents et ameliorer l'experience utilisateur. Elles ne sont pas revendues a des tiers.",
  },
  {
    title: "Demandes et support",
    body: "Pour toute demande liee a la confidentialite, a la securite ou a l'exercice de droits, le point de contact officiel reste support@oniix.space.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(64,86,200,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_24%),linear-gradient(180deg,#f7f1ea_0%,#efe6da_100%)]" />
      <div className="relative mx-auto max-w-5xl space-y-6">
        <header className="rounded-[30px] border border-[#d8cdbe] bg-[rgba(248,242,235,0.9)] p-6 shadow-[0_20px_55px_rgba(39,37,33,0.10)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <OniixLogo size="md" subtitle="Cadre de confiance produit" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a7066]">Informations legales</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Confidentialite</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#655d53]">
                  Oniix opere une plateforme OTT professionnelle. La confidentialite couvre l&apos;acces a la console, les
                  espaces editeurs, les signaux live et les journaux d&apos;exploitation.
                </p>
              </div>
            </div>
            <Link href="/" className="text-sm font-medium text-[#3549be] hover:text-[#2f40aa]">
              Retour a l&apos;accueil
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

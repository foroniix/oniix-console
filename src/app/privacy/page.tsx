import type { Metadata } from "next";
import Link from "next/link";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { ConsoleFooter } from "@/components/legal/console-footer";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Principes de confidentialité de la plateforme Oniix.",
};

const sections = [
  {
    title: "Données de compte",
    body: "Oniix traite les informations nécessaires à l’authentification, à la gestion des accès, aux rôles, aux invitations et à l’exploitation des espaces éditeurs.",
  },
  {
    title: "Données d’exploitation",
    body: "La plateforme peut enregistrer des signaux d’activité, des journaux d’audit, des événements live et des métriques techniques afin d’assurer la supervision des chaînes, des flux et de la sécurité produit.",
  },
  {
    title: "Usage des données",
    body: "Les données sont utilisées pour exploiter la console, sécuriser la diffusion, assister les équipes, diagnostiquer les incidents et améliorer l’expérience utilisateur. Elles ne sont pas revendues à des tiers.",
  },
  {
    title: "Demandes et support",
    body: "Pour toute demande liée à la confidentialité, à la sécurité ou à l’exercice de droits, le point de contact officiel reste support@oniix.space.",
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a7066]">Informations légales</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Confidentialité</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#655d53]">
                  Oniix opère une plateforme OTT professionnelle. La confidentialité couvre l’accès à la console, les
                  espaces éditeurs, les signaux live et les journaux d’exploitation.
                </p>
              </div>
            </div>
            <Link href="/" className="text-sm font-medium text-[#3549be] hover:text-[#2f40aa]">
              Retour à l’accueil
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

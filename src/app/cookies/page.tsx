import type { Metadata } from "next";
import Link from "next/link";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { ConsoleFooter } from "@/components/legal/console-footer";

export const metadata: Metadata = {
  title: "Cookies",
  description: "Politique cookies de la plateforme Oniix.",
};

const sections = [
  {
    title: "1. Cookies essentiels",
    body: "Ils maintiennent la session, la sécurité d'accès et le bon fonctionnement de la console. Sans eux, l'authentification, le changement d'espace et certaines opérations critiques ne fonctionnent pas correctement.",
  },
  {
    title: "2. Mesure d'usage produit",
    body: "Oniix peut enregistrer des signaux d'usage limités pour améliorer l'expérience console, diagnostiquer les incidents et suivre la qualité des parcours live. Ces mesures restent liées au produit et non à une régie publicitaire tierce.",
  },
  {
    title: "3. Duree de conservation",
    body: "Les cookies de session sont conservés le temps nécessaire à l'authentification et à la sécurité. Les préférences de consentement peuvent être mémorisées jusqu'à douze mois afin d'éviter une demande répétée à chaque visite.",
  },
  {
    title: "4. Gestion des preferences",
    body: "Tu peux choisir les cookies essentiels uniquement ou accepter les mesures d'usage. La bannière de consentement reste la référence visible côté interface, et les préférences peuvent être réinitialisées depuis le navigateur.",
  },
];

export default function CookiesPage() {
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
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Politique cookies</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#655d53]">
                  Oniix utilise des cookies de session indispensables et des mesures d&apos;usage produit limitées pour
                  opérer une plateforme OTT sécurisée et exploitable.
                </p>
              </div>
            </div>
            <Link href="/" className="text-sm font-medium text-[#3549be] hover:text-[#2f40aa]">
              Retour à l&apos;accueil
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

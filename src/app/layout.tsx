import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { CookieBanner } from "@/components/legal/cookie-banner";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-oniix-brand",
  display: "swap",
});

const GOOGLE_SITE_VERIFICATION_TOKEN =
  process.env.GOOGLE_SITE_VERIFICATION || "KfIdokg1Q_L9aKumnZCMlhQ5u4r-tolHGT5dpOuzYGc";

export const metadata: Metadata = {
  metadataBase: new URL("https://oniix.space"),
  title: {
    default: "Oniix | Streaming web, TV en direct, replays, films et series",
    template: "%s | Oniix",
  },
  description:
    "Oniix propose du streaming web avec TV en direct, replays, films, series et sport live sur mobile et navigateur.",
  applicationName: "Oniix",
  keywords: [
    "Oniix",
    "Oniix TV",
    "streaming Oniix",
    "streaming web",
    "Mobile TV",
    "plateforme OTT",
    "chaines TV",
    "TV en direct",
    "live TV",
    "sport en direct",
    "streaming sport",
    "replays TV",
    "films et series",
    "films en streaming",
    "series en streaming",
    "programmation TV",
    "mobile streaming",
    "television web",
    "catalogue video",
    "plateforme TV Afrique",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://oniix.space",
    siteName: "Oniix",
    title: "Oniix | Streaming web, TV en direct, replays, films et series",
    description:
      "Oniix propose du streaming web avec TV en direct, replays, films, series et sport live sur mobile et navigateur.",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oniix | Streaming web, TV en direct, replays, films et series",
    description:
      "Oniix propose du streaming web avec TV en direct, replays, films, series et sport live sur mobile et navigateur.",
  },
  verification: {
    google: GOOGLE_SITE_VERIFICATION_TOKEN,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full dark">
      <body className={`${manrope.variable} ${spaceGrotesk.variable} h-full`}>
        {children}
        <CookieBanner />
        <Toaster richColors theme="dark" />
      </body>
    </html>
  );
}

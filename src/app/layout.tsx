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

export const metadata: Metadata = {
  metadataBase: new URL("https://oniix.space"),
  title: {
    default: "Oniix | TV en direct, replays, films et series",
    template: "%s | Oniix",
  },
  description:
    "Oniix diffuse des chaines TV en direct, des replays, des films et des series sur mobile et sur le web.",
  applicationName: "Oniix",
  keywords: [
    "Oniix",
    "Oniix TV",
    "Mobile TV",
    "plateforme OTT",
    "chaînes TV",
    "TV en direct",
    "replays TV",
    "films et series",
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
    title: "Oniix | TV en direct, replays, films et series",
    description:
      "Oniix diffuse des chaines TV en direct, des replays, des films et des series sur mobile et sur le web.",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oniix | TV en direct, replays, films et series",
    description:
      "Oniix diffuse des chaines TV en direct, des replays, des films et des series sur mobile et sur le web.",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
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

import type { Metadata } from "next";
import { Baloo_2, Manrope } from "next/font/google";

import { CookieBanner } from "@/components/legal/cookie-banner";
import { Toaster } from "@/components/ui/sonner";
import { CONSOLE_PRODUCT_DESCRIPTION, CONSOLE_PRODUCT_NAME } from "@/lib/console-branding";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-oniix-brand",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://oniix.space"),
  title: {
    default: CONSOLE_PRODUCT_NAME,
    template: "%s | Oniix",
  },
  description: CONSOLE_PRODUCT_DESCRIPTION,
  applicationName: "Oniix",
  keywords: [
    "Oniix",
    "Oniix TV",
    "Mobile TV",
    "OTT platform",
    "plateforme OTT",
    "TV channels",
    "chaines TV",
    "programmation TV",
    "mobile streaming",
    "broadcast operations",
    "Africa TV platform",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://oniix.space",
    siteName: "Oniix",
    title: CONSOLE_PRODUCT_NAME,
    description: CONSOLE_PRODUCT_DESCRIPTION,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: CONSOLE_PRODUCT_NAME,
    description: CONSOLE_PRODUCT_DESCRIPTION,
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
      <body className={`${manrope.variable} ${baloo.variable} h-full`}>
        {children}
        <CookieBanner />
        <Toaster richColors theme="dark" />
      </body>
    </html>
  );
}

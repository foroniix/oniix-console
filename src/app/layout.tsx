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
  title: {
    default: CONSOLE_PRODUCT_NAME,
    template: "%s | Oniix",
  },
  description: CONSOLE_PRODUCT_DESCRIPTION,
  applicationName: "Oniix",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${manrope.variable} ${baloo.variable} h-full`}>
        {children}
        <CookieBanner />
        <Toaster richColors theme="system" />
      </body>
    </html>
  );
}

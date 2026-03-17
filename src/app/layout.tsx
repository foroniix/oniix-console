import { Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { CONSOLE_PRODUCT_DESCRIPTION, CONSOLE_PRODUCT_NAME } from "@/lib/console-branding";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

export const metadata = {
  title: CONSOLE_PRODUCT_NAME,
  description: CONSOLE_PRODUCT_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${manrope.variable} h-full`}>
        {children}
        <Toaster richColors theme="system" />
      </body>
    </html>
  );
}





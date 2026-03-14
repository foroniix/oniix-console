// admin/src/app/layout.tsx
import { Toaster } from "@/components/ui/sonner";
import { CONSOLE_PRODUCT_DESCRIPTION, CONSOLE_PRODUCT_NAME } from "@/lib/console-branding";
import "./globals.css";

export const metadata = {
  title: CONSOLE_PRODUCT_NAME,
  description: CONSOLE_PRODUCT_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full">
        {children}
        <Toaster richColors theme="dark" />
      </body>
    </html>
  );
}





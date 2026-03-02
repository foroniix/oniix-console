// admin/src/app/layout.tsx
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata = { title: "Console Editeur Oniix" };

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





// admin/src/app/layout.tsx
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata = { title: "Oniix Admin" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full bg-[#0a0b0d] text-zinc-100">
        {children}
        <Toaster richColors theme="dark" />
      </body>
    </html>
  );
}





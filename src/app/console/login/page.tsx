import type { Metadata } from "next";

import { ConsoleLoginScreen } from "@/components/auth/console-login-screen";

export const metadata: Metadata = {
  title: "Connexion console | Oniix",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ConsoleLoginPage() {
  return <ConsoleLoginScreen />;
}

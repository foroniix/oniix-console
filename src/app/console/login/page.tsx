import type { Metadata } from "next";

import { ConsoleLoginScreen } from "@/components/auth/console-login-screen";
import { redirectIfConsoleAuthenticated } from "@/lib/console-access";

export const metadata: Metadata = {
  title: "Connexion console | Oniix",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function ConsoleLoginPage() {
  await redirectIfConsoleAuthenticated();
  return <ConsoleLoginScreen />;
}

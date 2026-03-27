import SignupPage from "@/app/signup/page";
import { redirectIfConsoleAuthenticated } from "@/lib/console-access";

export const metadata = {
  title: "Inscription console | Oniix",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function ConsoleSignupPage() {
  await redirectIfConsoleAuthenticated();
  return <SignupPage />;
}

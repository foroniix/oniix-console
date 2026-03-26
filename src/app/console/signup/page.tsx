import SignupPage from "@/app/signup/page";

export const metadata = {
  title: "Inscription console | Oniix",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ConsoleSignupPage() {
  return <SignupPage />;
}

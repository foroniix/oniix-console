"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

import { OniixLogo } from "@/components/branding/oniix-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AUTH_SLIDES = [
  {
    src: "/branding/photography/rural-broadband-data-center.jpg",
    alt: "Technicien dans une salle reseau",
    className: "object-center",
  },
  {
    src: "/branding/photography/fiber-field-work.jpg",
    alt: "Intervention fibre sur le terrain",
    className: "object-center",
  },
  {
    src: "/branding/photography/communications-tower.jpg",
    alt: "Infrastructure telecom",
    className: "object-center",
  },
] as const;

function Field({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#f1d06d]/70" />
      {children}
    </div>
  );
}

export function ConsoleLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember: true }),
      });

      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error || "Identifiants invalides.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#090909] text-white">
      <div className="absolute inset-0">
        {AUTH_SLIDES.map((slide, index) => (
          <div
            key={slide.src}
            className="oniix-auth-slide absolute inset-0"
            style={{ animationDelay: `${index * 6}s` }}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={index === 0}
              sizes="100vw"
              className={`object-cover ${slide.className}`}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,6,6,0.88)_0%,rgba(9,9,9,0.54)_42%,rgba(6,6,6,0.82)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,190,66,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,196,78,0.14),transparent_24%)]" />
        <div className="oniix-auth-sweep absolute inset-y-0 right-[12%] w-[28rem] bg-[linear-gradient(90deg,transparent,rgba(255,212,96,0.09),transparent)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f2cb63]/40 to-transparent" />
      </div>

      <div className="relative flex min-h-dvh flex-col">
        <div className="flex flex-1 items-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1480px] justify-center lg:justify-end">
            <section className="w-full max-w-[432px] overflow-hidden rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,15,15,0.76),rgba(8,8,8,0.82))] shadow-[0_42px_120px_rgba(0,0,0,0.46)] backdrop-blur-[22px]">
              <div className="px-7 pb-6 pt-7 sm:px-8">
                <OniixLogo size="md" subtitle={undefined} showMark={false} />
                <div className="mt-5 h-px bg-gradient-to-r from-[#f2cb63]/60 via-white/12 to-transparent" />
              </div>

              <div className="px-7 pb-8 pt-1 sm:px-8">
                <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-white">
                  Connexion
                </h1>

                <form onSubmit={submit} className="mt-7 space-y-4">
                  <Field icon={Mail}>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Email"
                      autoFocus
                      className="h-12 rounded-[18px] border-white/10 bg-[rgba(16,16,16,0.72)] pl-11 text-white placeholder:text-[#9a9a9a] focus-visible:border-[#f2cb63]/40 focus-visible:ring-[#f2cb63]/18"
                    />
                  </Field>

                  <Field icon={Lock}>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Mot de passe"
                      className="h-12 rounded-[18px] border-white/10 bg-[rgba(16,16,16,0.72)] pl-11 text-white placeholder:text-[#9a9a9a] focus-visible:border-[#f2cb63]/40 focus-visible:ring-[#f2cb63]/18"
                    />
                  </Field>

                  {error ? (
                    <div className="rounded-[18px] border border-rose-500/24 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                      {error}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-[18px] border-[#f2cb63]/24 bg-[linear-gradient(180deg,#f2d06e,#d6ab32)] text-[#15110a] shadow-[0_18px_42px_rgba(214,171,50,0.28)] hover:brightness-105"
                  >
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Connexion"}
                  </Button>
                </form>
              </div>
            </section>
          </div>
        </div>

        <footer className="relative border-t border-white/10 px-4 py-4 text-center text-xs text-white/56 sm:px-6">
          © {new Date().getFullYear()} Oniix
        </footer>
      </div>
    </main>
  );
}

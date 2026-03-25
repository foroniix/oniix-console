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
    src: "/branding/editorial/oniix-control-room.svg",
    alt: "Oniix control room",
  },
  {
    src: "/branding/editorial/oniix-signal-wall.svg",
    alt: "Oniix signal wall",
  },
  {
    src: "/branding/editorial/oniix-mobile-command.svg",
    alt: "Oniix mobile command",
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
      <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#9dcfff]/70" />
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
    <main className="relative min-h-dvh overflow-hidden bg-[#020d19] text-white">
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
              className="object-cover object-center"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,10,19,0.82)_0%,rgba(2,11,20,0.58)_38%,rgba(2,11,20,0.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(18,140,224,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(243,144,78,0.18),transparent_24%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
      </div>

      <div className="relative flex min-h-dvh flex-col">
        <div className="flex flex-1 items-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1480px] justify-center lg:justify-end">
            <section className="w-full max-w-[440px] overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,20,36,0.82),rgba(4,16,30,0.88))] shadow-[0_38px_120px_rgba(0,0,0,0.42)] backdrop-blur-[18px]">
              <div className="border-b border-white/10 px-7 pb-6 pt-7 sm:px-8">
                <OniixLogo size="md" subtitle={undefined} />
              </div>

              <div className="px-7 pb-8 pt-6 sm:px-8">
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
                      className="h-12 rounded-[18px] border-white/10 bg-[rgba(3,13,24,0.72)] pl-11 text-white placeholder:text-slate-500"
                    />
                  </Field>

                  <Field icon={Lock}>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Mot de passe"
                      className="h-12 rounded-[18px] border-white/10 bg-[rgba(3,13,24,0.72)] pl-11 text-white placeholder:text-slate-500"
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
                    className="h-12 w-full rounded-[18px] bg-[#0f86e6] text-white hover:bg-[#29a0ff]"
                  >
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Connexion"}
                  </Button>
                </form>
              </div>
            </section>
          </div>
        </div>

        <footer className="relative border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400 sm:px-6">
          © {new Date().getFullYear()} Oniix
        </footer>
      </div>
    </main>
  );
}

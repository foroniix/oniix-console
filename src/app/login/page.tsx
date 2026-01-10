"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, Mail, Lock, ShieldCheck, Tv2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Slide = {
  title: string;
  desc: string;
  imageSrc: string; // remote URL
};

const SLIDES: Slide[] = [
  {
    title: "Opérations OTT, sans friction",
    desc: "Pilotez diffusion, monitoring et performance depuis une console unique.",
    imageSrc:
      "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1600&q=80",
  },
  {
    title: "Supervision & qualité de service",
    desc: "Gardez le contrôle sur la disponibilité, les alertes et les incidents.",
    imageSrc:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
  },
  {
    title: "Sécurité et accès maîtrisés",
    desc: "Une expérience fiable et cohérente pour vos équipes.",
    imageSrc:
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1600&q=80",
  },
];

function AuthSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Respect "reduce motion"
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return;

    if (paused) return;

    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 4500);

    return () => window.clearInterval(t);
  }, [paused]);

  return (
    <div
      className="mt-8 rounded-3xl border border-white/10 bg-zinc-900/20 p-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[320px] overflow-hidden rounded-2xl">
        {SLIDES.map((s, i) => (
          <div
            key={s.imageSrc}
            className={[
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            <Image
              src={s.imageSrc}
              alt={s.title}
              fill
              priority={i === 0}
              className="object-cover"
              sizes="(max-width: 768px) 0px, 520px"
            />

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/35 to-zinc-950/10" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl" />

            {/* Caption */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="text-sm font-semibold text-white">{s.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-zinc-300/80">{s.desc}</div>

              {/* Dots */}
              <div className="mt-4 flex items-center gap-2">
                {SLIDES.map((_, dot) => (
                  <button
                    key={dot}
                    type="button"
                    aria-label={`Aller au slide ${dot + 1}`}
                    onClick={() => setIndex(dot)}
                    className={[
                      "h-1.5 rounded-full transition-all",
                      dot === index ? "w-6 bg-white/80" : "w-2.5 bg-white/30 hover:bg-white/45",
                    ].join(" ")}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{paused ? "Pause" : "Auto"}</span>
        <span>
          {index + 1}/{SLIDES.length}
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Optionnel pour le signup uniquement (si tu veux le garder)
  const [orgName, setOrgName] = useState("");

  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const title = useMemo(() => (mode === "login" ? "Connexion" : "Créer un compte"), [mode]);

  const subtitle = useMemo(
    () =>
      mode === "login"
        ? "Accédez à la console de gestion OTT TV."
        : "Créez votre compte pour accéder à la console.",
    [mode]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        mode === "login"
          ? { email, password, remember }
          : { email, password, tenantName: orgName?.trim() || null };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (mode === "login" ? "Identifiants incorrects." : "Inscription impossible."));
      }
    } catch {
      setError(mode === "login" ? "Erreur de connexion. Réessayez." : "Erreur d'inscription. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-[110px]" />
        <div className="absolute -bottom-24 -right-24 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/30 shadow-2xl backdrop-blur-xl md:grid-cols-2">
          {/* Left panel */}
          <div className="hidden flex-col justify-between p-10 md:flex">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/60">
                <Tv2 className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Oniix Console</div>
                <div className="text-xs text-zinc-400">OTT TV Operations</div>
              </div>
            </div>

            <div className="mt-10 space-y-6">
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Console de gestion professionnelle pour plateformes OTT.
              </h2>

              {/* Slideshow */}
              <AuthSlideshow />
            </div>

            <div className="text-xs text-zinc-600">© {new Date().getFullYear()} Oniix</div>
          </div>

          {/* Right panel */}
          <div className="p-6 sm:p-10">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/50 md:hidden">
                    <ShieldCheck className="h-5 w-5 text-indigo-400" />
                  </div>
                  <h1 className="text-xl font-semibold text-white">{title}</h1>
                </div>
                <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
              </div>

              {/* Mode switch */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-1">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    disabled={isLoading}
                    className={[
                      "h-9 rounded-xl px-3 text-xs font-medium transition",
                      mode === "login" ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/5",
                    ].join(" ")}
                  >
                    Connexion
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    disabled={isLoading}
                    className={[
                      "h-9 rounded-xl px-3 text-xs font-medium transition",
                      mode === "signup" ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/5",
                    ].join(" ")}
                  >
                    Inscription
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <label className="ml-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Organisation (optionnel)
                  </label>
                  <Input
                    type="text"
                    placeholder="Nom de l’organisation"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="h-11 bg-zinc-950/40 border-zinc-800 text-white placeholder:text-zinc-700"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="ml-1 text-xs font-medium uppercase tracking-wider text-zinc-400">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-10 bg-zinc-950/40 border-zinc-800 text-white placeholder:text-zinc-700"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Mot de passe
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10 bg-zinc-950/40 border-zinc-800 text-white placeholder:text-zinc-700"
                  />
                </div>
              </div>

              {mode === "login" && (
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-400 select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-zinc-900/60"
                    />
                    Rester connecté
                  </label>

                  <button type="button" className="text-xs text-zinc-400 hover:text-white transition" disabled={isLoading}>
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center text-xs font-medium text-rose-300">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : mode === "login" ? (
                  <>
                    Se connecter <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Créer mon compte <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

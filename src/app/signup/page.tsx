"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Globe2,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ORGANIZATION_TYPE_OPTIONS,
  PRIMARY_USE_CASE_OPTIONS,
  TEAM_SIZE_OPTIONS,
  isPersonalEmailDomain,
  optionLabel,
} from "@/lib/tenant-onboarding";
import { cn } from "@/lib/utils";

const PASSWORD_RULES = [
  { id: "length", label: "12 caracteres minimum", test: (value: string) => value.length >= 12 },
  { id: "lower", label: "une minuscule", test: (value: string) => /[a-z]/.test(value) },
  { id: "upper", label: "une majuscule", test: (value: string) => /[A-Z]/.test(value) },
  { id: "number", label: "un chiffre", test: (value: string) => /\d/.test(value) },
  { id: "symbol", label: "un caractere special", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

const STEPS = [
  { id: 1, label: "Organisation", hint: "Structure et perimetre" },
  { id: 2, label: "Responsable", hint: "Compte principal" },
  { id: 3, label: "Securite", hint: "Acces et validation" },
] as const;

function StepChip({
  active,
  complete,
  step,
}: {
  active: boolean;
  complete: boolean;
  step: (typeof STEPS)[number];
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border px-4 py-3 transition",
        active
          ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10"
          : complete
            ? "border-emerald-500/20 bg-emerald-500/10"
            : "border-white/8 bg-white/[0.03]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Etape {step.id}
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{step.label}</div>
        </div>
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-full border text-xs font-semibold",
            active
              ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/12 text-[var(--brand-primary)]"
              : complete
                ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
                : "border-white/10 bg-white/[0.04] text-slate-400"
          )}
        >
          {complete ? <CheckCircle2 className="size-4" /> : step.id}
        </span>
      </div>
      <div className="mt-1 text-xs text-slate-400">{step.hint}</div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  hint,
  iconPosition = "center",
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  iconPosition?: "center" | "top";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</label>
      <div className="relative">
        <Icon
          className={cn(
            "pointer-events-none absolute left-4 size-4 text-slate-500",
            iconPosition === "center" ? "top-1/2 -translate-y-1/2" : "top-4"
          )}
        />
        {children}
      </div>
      {hint ? <p className="text-xs leading-5 text-slate-400">{hint}</p> : null}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<(typeof STEPS)[number]["id"]>(1);
  const [fullName, setFullName] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [orgName, setOrgName] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [organizationType, setOrganizationType] = React.useState("");
  const [teamSize, setTeamSize] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [primaryUseCase, setPrimaryUseCase] = React.useState("");
  const [launchNotes, setLaunchNotes] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const checks = React.useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, valid: rule.test(password) })),
    [password]
  );

  const isProfessionalEmail = React.useMemo(() => {
    if (!email.includes("@")) return true;
    return !isPersonalEmailDomain(email);
  }, [email]);

  const organizationReady =
    orgName.trim().length >= 2 &&
    country.trim().length >= 2 &&
    organizationType.length > 0 &&
    teamSize.length > 0;
  const operatorReady =
    fullName.trim().length >= 2 &&
    jobTitle.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    primaryUseCase.length > 0;
  const securityReady =
    password === confirmPassword &&
    acceptedTerms &&
    checks.every((rule) => rule.valid);
  const progressValue = (step / STEPS.length) * 100;

  const moveNext = () => {
    setError("");

    if (step === 1 && !organizationReady) {
      setError("Renseignez correctement votre organisation avant de continuer.");
      return;
    }

    if (step === 2 && !operatorReady) {
      setError("Renseignez le responsable principal avant de continuer.");
      return;
    }

    setStep((current) => Math.min(3, current + 1) as (typeof STEPS)[number]["id"]);
  };

  const moveBack = () => {
    setError("");
    setStep((current) => Math.max(1, current - 1) as (typeof STEPS)[number]["id"]);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!organizationReady) {
      setError("Le profil organisationnel est incomplet.");
      setStep(1);
      return;
    }

    if (!operatorReady) {
      setError("Le responsable principal doit etre renseigne.");
      setStep(2);
      return;
    }

    if (!acceptedTerms) {
      setError("Vous devez accepter les conditions pour creer un espace.");
      setStep(3);
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setStep(3);
      return;
    }

    if (checks.some((rule) => !rule.valid)) {
      setError("Le mot de passe ne respecte pas le niveau de securite requis.");
      setStep(3);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          jobTitle,
          tenantName: orgName,
          email,
          country,
          organizationType,
          teamSize,
          primaryUseCase,
          launchNotes,
          password,
          acceptedTerms,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; message?: string; requires_email_confirmation?: boolean }
        | null;

      if (!res.ok || !json?.ok) {
        setError(json?.error || "Inscription impossible.");
        return;
      }

      if (json.requires_email_confirmation) {
        setSuccess(
          json.message ||
            "Compte cree. Verifiez votre email pour confirmer votre adresse avant votre premiere connexion."
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erreur d'inscription. Reessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow="Onboarding tenant"
      title="Creez votre espace operateur."
      subtitle="Renseignez votre organisation, le responsable principal et le cadre de securite avant le provisionnement de la console."
      footer={
        <div className="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Deja invite ou deja equipe ?{" "}
            <Link href="/console/login" className="font-semibold text-[var(--brand-primary)] hover:text-white">
              Se connecter
            </Link>
          </p>
          <span className="inline-flex items-center gap-2 text-slate-400">
            <ShieldCheck className="size-4 text-[var(--brand-primary)]" />
            Provisionnement controle
          </span>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-4 rounded-[28px] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Etape {step} / {STEPS.length}
              </div>
              <div className="mt-1 text-base font-semibold text-white">{STEPS[step - 1]?.label}</div>
            </div>
            <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-400">
              Provisionnement tenant
            </div>
          </div>
          <Progress value={progressValue} className="h-2 bg-white/8" />
          <div className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((entry) => (
              <StepChip key={entry.id} step={entry} active={step === entry.id} complete={step > entry.id} />
            ))}
          </div>
        </div>

        {step === 1 ? (
          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-5">
              <Field label="Organisation" icon={Building2} hint="Nom visible dans la console et les espaces de travail.">
                <Input
                  type="text"
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  placeholder="Nom de votre chaine, groupe ou plateforme"
                  required
                  className="pl-11"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Type d'activite" icon={BadgeCheck}>
                  <Select value={organizationType} onValueChange={setOrganizationType}>
                    <SelectTrigger className="w-full pl-11">
                      <SelectValue placeholder="Choisir un profil" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Taille d'equipe" icon={User2}>
                  <Select value={teamSize} onValueChange={setTeamSize}>
                    <SelectTrigger className="w-full pl-11">
                      <SelectValue placeholder="Choisir une taille" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Pays principal" icon={Globe2} hint="Pays de reference pour l'exploitation initiale.">
                <Input
                  type="text"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  placeholder="Benin, France, Senegal..."
                  className="pl-11"
                />
              </Field>
            </div>

            <div className="space-y-4 rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
              <div className="text-sm font-semibold text-white">Apercu de l&apos;espace</div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Nom affiche</div>
                <div className="mt-2 text-lg font-semibold text-white">{orgName.trim() || "Votre organisation"}</div>
                <div className="mt-3 text-sm leading-6 text-slate-400">
                  {optionLabel(ORGANIZATION_TYPE_OPTIONS, organizationType) || "Le profil d'organisation apparaitra ici."}
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Perimetre</div>
                  <div className="mt-2 text-sm text-white">{country.trim() || "Pays principal a definir"}</div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Equipe</div>
                  <div className="mt-2 text-sm text-white">
                    {optionLabel(TEAM_SIZE_OPTIONS, teamSize) || "Taille d'equipe a confirmer"}
                  </div>
                </div>
                <div className="rounded-[22px] border border-emerald-500/16 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
                  Un espace tenant dedie, un proprietaire initial et une base de controle d&apos;acces seront provisionnes.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr]">
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Responsable principal" icon={User2} hint="Ce compte devient le proprietaire initial de l'espace.">
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Prenom Nom"
                    className="pl-11"
                  />
                </Field>

                <Field label="Fonction" icon={BadgeCheck}>
                  <Input
                    type="text"
                    value={jobTitle}
                    onChange={(event) => setJobTitle(event.target.value)}
                    placeholder="Directeur operations, CTO, Responsable OTT..."
                    className="pl-11"
                  />
                </Field>
              </div>

              <Field
                label="Email de reference"
                icon={Mail}
                hint="Un domaine professionnel facilite la gouvernance et la validation du compte."
              >
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nom@organisation.tv"
                  required
                  className="pl-11"
                />
              </Field>

              <Field label="Objectif prioritaire" icon={ArrowRight}>
                <Select value={primaryUseCase} onValueChange={setPrimaryUseCase}>
                  <SelectTrigger className="w-full pl-11">
                    <SelectValue placeholder="Choisir un objectif de lancement" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIMARY_USE_CASE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Notes de cadrage"
                icon={Building2}
                iconPosition="top"
                hint="Facultatif. Donnez le contexte initial: nombre de chaines, catalogue, pays ou timing."
              >
                <Textarea
                  value={launchNotes}
                  onChange={(event) => setLaunchNotes(event.target.value)}
                  placeholder="Exemple: lancement de 4 chaines live et d'un premier catalogue films / series au T2."
                  className="min-h-28 pl-11"
                />
              </Field>
            </div>

            <div className="space-y-4 rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
              <div className="text-sm font-semibold text-white">Lecture de gouvernance</div>
              {!isProfessionalEmail && email ? (
                <div className="rounded-[22px] border border-amber-500/18 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                  Un email personnel reste possible, mais un domaine professionnel renforce la credibilite du tenant et la gestion des acces.
                </div>
              ) : (
                <div className="rounded-[22px] border border-emerald-500/16 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
                  L&apos;adresse de reference servira de proprietaire initial pour l&apos;espace et les validations ulterieures.
                </div>
              )}
              <div className="grid gap-3">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Responsable</div>
                  <div className="mt-2 text-sm text-white">{fullName.trim() || "A definir"}</div>
                  <div className="mt-1 text-xs text-slate-400">{jobTitle.trim() || "Fonction a confirmer"}</div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Lancement vise</div>
                  <div className="mt-2 text-sm text-white">
                    {optionLabel(PRIMARY_USE_CASE_OPTIONS, primaryUseCase) || "Objectif a confirmer"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Mot de passe" icon={Lock} hint="Utilisez un secret unique pour la console multi-tenant.">
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Choisissez un mot de passe fort"
                    required
                    className="pl-11"
                  />
                </Field>

                <Field label="Confirmation" icon={Lock}>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Retapez le mot de passe"
                    required
                    className="pl-11"
                  />
                </Field>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-sm font-semibold text-white">Niveau de securite requis</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {checks.map((rule) => (
                    <div key={rule.id} className="inline-flex items-center gap-2 text-sm text-slate-300">
                      <span
                        className={
                          rule.valid
                            ? "inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-300"
                            : "inline-flex size-5 items-center justify-center rounded-full bg-white/8 text-slate-500"
                        }
                      >
                        <CheckCircle2 className="size-3.5" />
                      </span>
                      {rule.label}
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-0.5 size-4 rounded border-white/15 bg-transparent text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
                <span>J&apos;accepte les conditions d&apos;utilisation et le provisionnement securise de mon espace Oniix.</span>
              </label>
            </div>

            <div className="space-y-4 rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
              <div className="text-sm font-semibold text-white">Resume de provisionnement</div>
              <div className="grid gap-3">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Organisation</div>
                  <div className="mt-2 text-sm text-white">{orgName.trim() || "Votre espace"}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {optionLabel(ORGANIZATION_TYPE_OPTIONS, organizationType) || "Profil non selectionne"}
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Responsable</div>
                  <div className="mt-2 text-sm text-white">{fullName.trim() || "Responsable a confirmer"}</div>
                  <div className="mt-1 text-xs text-slate-400">{email.trim() || "Email a confirmer"}</div>
                </div>
                <div className="rounded-[22px] border border-emerald-500/16 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
                  L&apos;espace sera provisionne avec un proprietaire initial, une separation tenant dediee et un controle d&apos;acces backend.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-6 text-slate-400">
            L&apos;acces console n&apos;est accorde qu&apos;aux comptes tenant provisions.
          </div>
          <div className="flex gap-3">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={moveBack}>
                <ArrowLeft className="size-4" />
                Retour
              </Button>
            ) : null}

            {step < 3 ? (
              <Button type="button" onClick={moveNext}>
                Continuer
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading || !securityReady} className="min-w-[180px]">
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Creer l&apos;espace
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </AuthFrame>
  );
}

export const ORGANIZATION_TYPE_OPTIONS = [
  { value: "broadcaster", label: "Diffuseur / chaine" },
  { value: "operator", label: "Operateur / plateforme" },
  { value: "studio", label: "Studio / production" },
  { value: "publisher", label: "Editeur digital" },
  { value: "agency", label: "Agence / partenaire" },
  { value: "enterprise", label: "Entreprise / institution" },
] as const;

export const TEAM_SIZE_OPTIONS = [
  { value: "1-5", label: "1 a 5 personnes" },
  { value: "6-20", label: "6 a 20 personnes" },
  { value: "21-50", label: "21 a 50 personnes" },
  { value: "51-200", label: "51 a 200 personnes" },
  { value: "200-plus", label: "Plus de 200 personnes" },
] as const;

export const PRIMARY_USE_CASE_OPTIONS = [
  { value: "launch_live_channels", label: "Lancer et operer des chaines live" },
  { value: "manage_catalog", label: "Distribuer un catalogue films / series" },
  { value: "monetize_streaming", label: "Monetiser une offre streaming" },
  { value: "multi_platform_distribution", label: "Distribuer sur web, mobile et partenaires" },
  { value: "enterprise_broadcast", label: "Piloter une diffusion entreprise / institution" },
] as const;

export const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.fr",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "aol.com",
]);

export const ORGANIZATION_TYPE_VALUES = ORGANIZATION_TYPE_OPTIONS.map((option) => option.value) as [
  (typeof ORGANIZATION_TYPE_OPTIONS)[number]["value"],
  ...(typeof ORGANIZATION_TYPE_OPTIONS)[number]["value"][],
];

export const TEAM_SIZE_VALUES = TEAM_SIZE_OPTIONS.map((option) => option.value) as [
  (typeof TEAM_SIZE_OPTIONS)[number]["value"],
  ...(typeof TEAM_SIZE_OPTIONS)[number]["value"][],
];

export const PRIMARY_USE_CASE_VALUES = PRIMARY_USE_CASE_OPTIONS.map((option) => option.value) as [
  (typeof PRIMARY_USE_CASE_OPTIONS)[number]["value"],
  ...(typeof PRIMARY_USE_CASE_OPTIONS)[number]["value"][],
];

export type OrganizationType = (typeof ORGANIZATION_TYPE_VALUES)[number];
export type TeamSize = (typeof TEAM_SIZE_VALUES)[number];
export type PrimaryUseCase = (typeof PRIMARY_USE_CASE_VALUES)[number];

export function isPersonalEmailDomain(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return PERSONAL_EMAIL_DOMAINS.has(domain);
}

export function optionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string | null
) {
  if (!value) return "";
  return options.find((option) => option.value === value)?.label ?? value;
}

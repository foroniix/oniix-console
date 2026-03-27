import { formatTenantRoleLabel, normalizeTenantRole } from "@/lib/tenant-roles";

export const CONSOLE_PRODUCT_NAME = "Oniix Console";
export const CONSOLE_PRODUCT_DESCRIPTION =
  "Pilotage multi-tenant pour la diffusion, le catalogue, la monétisation et les opérations.";
export const CONSOLE_DEFAULT_WORKSPACE_NAME = "Espace de travail";
export const CONSOLE_PLATFORM_WORKSPACE_NAME = "Oniix Platform";
export const SUPPORT_EMAIL = "support@oniix.space";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Support%20Oniix%20Console`;

function normalizeWhitespace(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function titleize(value: string) {
  return value.replace(/\b\p{L}/gu, (char) => char.toLocaleUpperCase("fr-FR"));
}

export function deriveDisplayName(fullName?: string | null, email?: string | null) {
  const normalizedName = normalizeWhitespace(fullName);
  if (normalizedName) return normalizedName;

  const localPart = normalizeWhitespace(email).split("@")[0] ?? "";
  const alias = localPart.replace(/[._-]+/g, " ").trim();
  if (alias) return titleize(alias);

  return "Utilisateur Oniix";
}

export function buildInitials(fullName?: string | null, email?: string | null) {
  const source = deriveDisplayName(fullName, email);
  const parts = source.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "O").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "N").toUpperCase();
  return `${a}${b}`;
}

export function formatRoleLabel(value?: string | null) {
  const role = normalizeWhitespace(value).toLowerCase();
  if (["superadmin", "oniix_admin", "platform_admin"].includes(role)) return "Superadmin";
  if (["analyst", "analyste"].includes(role)) return "Analyste";
  return formatTenantRoleLabel(normalizeTenantRole(role));
}

export function defaultWorkspaceName(role?: string | null) {
  const normalizedRole = normalizeWhitespace(role).toLowerCase();
  if (["superadmin", "oniix_admin", "platform_admin"].includes(normalizedRole)) {
    return CONSOLE_PLATFORM_WORKSPACE_NAME;
  }
  return CONSOLE_DEFAULT_WORKSPACE_NAME;
}

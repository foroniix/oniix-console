export const TENANT_ROLES = ["owner", "admin", "editor", "viewer"] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

export type TenantCapability =
  | "view_workspace"
  | "manage_workspace"
  | "manage_members"
  | "manage_invites"
  | "manage_security"
  | "manage_monetization"
  | "edit_catalog"
  | "operate_live"
  | "view_analytics";

const ROLE_ALIASES: Record<string, TenantRole> = {
  owner: "owner",
  admin: "admin",
  tenant_admin: "admin",
  editor: "editor",
  editeur: "editor",
  analyst: "viewer",
  analyste: "viewer",
  viewer: "viewer",
  member: "viewer",
  user: "viewer",
  read_only: "viewer",
};

const ROLE_LABELS: Record<TenantRole, string> = {
  owner: "Proprietaire",
  admin: "Administrateur",
  editor: "Editeur",
  viewer: "Lecteur",
};

const ROLE_CAPABILITIES: Record<TenantRole, TenantCapability[]> = {
  owner: [
    "view_workspace",
    "manage_workspace",
    "manage_members",
    "manage_invites",
    "manage_security",
    "manage_monetization",
    "edit_catalog",
    "operate_live",
    "view_analytics",
  ],
  admin: [
    "view_workspace",
    "manage_workspace",
    "manage_members",
    "manage_invites",
    "manage_security",
    "manage_monetization",
    "edit_catalog",
    "operate_live",
    "view_analytics",
  ],
  editor: [
    "view_workspace",
    "edit_catalog",
    "operate_live",
    "view_analytics",
  ],
  viewer: [
    "view_workspace",
    "view_analytics",
  ],
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function normalizeTenantRole(value?: string | null): TenantRole {
  return ROLE_ALIASES[normalize(value)] ?? "viewer";
}

export function formatTenantRoleLabel(value?: string | null) {
  return ROLE_LABELS[normalizeTenantRole(value)];
}

export function hasTenantCapability(role: string | null | undefined, capability: TenantCapability) {
  return ROLE_CAPABILITIES[normalizeTenantRole(role)].includes(capability);
}

export function canAssignTenantRole(actorRole: string | null | undefined, targetRole: string | null | undefined) {
  const actor = normalizeTenantRole(actorRole);
  const target = normalizeTenantRole(targetRole);

  if (actor === "owner") return target !== "owner";
  if (actor === "admin") return target === "editor" || target === "viewer";
  return false;
}

export function getAssignableTenantRoles(actorRole: string | null | undefined): TenantRole[] {
  return TENANT_ROLES.filter((candidate) => canAssignTenantRole(actorRole, candidate));
}

import { describe, expect, it } from "vitest";

import {
  canAssignTenantRole,
  formatTenantRoleLabel,
  getAssignableTenantRoles,
  hasTenantCapability,
  normalizeTenantRole,
} from "@/lib/tenant-roles";

describe("tenant roles", () => {
  it("normalizes legacy aliases to canonical tenant roles", () => {
    expect(normalizeTenantRole("tenant_admin")).toBe("admin");
    expect(normalizeTenantRole("member")).toBe("viewer");
    expect(normalizeTenantRole("editeur")).toBe("editor");
    expect(normalizeTenantRole("unknown")).toBe("viewer");
  });

  it("exposes role labels for the console", () => {
    expect(formatTenantRoleLabel("owner")).toBe("Proprietaire");
    expect(formatTenantRoleLabel("admin")).toBe("Administrateur");
    expect(formatTenantRoleLabel("editor")).toBe("Editeur");
    expect(formatTenantRoleLabel("viewer")).toBe("Lecteur");
  });

  it("maps capabilities to normalized roles", () => {
    expect(hasTenantCapability("owner", "manage_members")).toBe(true);
    expect(hasTenantCapability("admin", "manage_security")).toBe(true);
    expect(hasTenantCapability("admin", "manage_monetization")).toBe(true);
    expect(hasTenantCapability("editor", "manage_members")).toBe(false);
    expect(hasTenantCapability("editor", "manage_monetization")).toBe(false);
    expect(hasTenantCapability("member", "view_analytics")).toBe(true);
  });

  it("restricts assignable roles by actor role", () => {
    expect(canAssignTenantRole("owner", "admin")).toBe(true);
    expect(canAssignTenantRole("owner", "owner")).toBe(false);
    expect(canAssignTenantRole("admin", "admin")).toBe(false);
    expect(canAssignTenantRole("admin", "editor")).toBe(true);
    expect(getAssignableTenantRoles("admin")).toEqual(["editor", "viewer"]);
  });
});

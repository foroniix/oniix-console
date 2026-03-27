import "server-only";

import { redirect } from "next/navigation";

import { requireTenant, type AuthContext } from "@/app/api/_utils/auth";

const PLATFORM_CONSOLE_ROLES = new Set(["oniix_admin", "superadmin"]);

export async function hasConsoleAccess(ctx: AuthContext) {
  const normalizedRole = (ctx.role || "").trim().toLowerCase();
  if (PLATFORM_CONSOLE_ROLES.has(normalizedRole)) {
    return true;
  }

  if (!ctx.tenantId) {
    return false;
  }

  const tenantGuard = await requireTenant(ctx);
  return tenantGuard === null;
}

export async function redirectIfConsoleAuthenticated() {
  const { requireAuth } = await import("@/app/api/_utils/auth");
  const auth = await requireAuth();
  if ("res" in auth) return;

  if (await hasConsoleAccess(auth.ctx)) {
    redirect("/dashboard");
  }
}

export async function requireConsoleAccess(redirectTo = "/console/login") {
  const { requireAuth } = await import("@/app/api/_utils/auth");
  const auth = await requireAuth();
  if ("res" in auth) {
    redirect(redirectTo);
  }

  if (!(await hasConsoleAccess(auth.ctx))) {
    redirect(redirectTo);
  }

  return auth.ctx;
}

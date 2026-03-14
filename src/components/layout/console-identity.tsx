"use client";

import * as React from "react";

import { defaultWorkspaceName, deriveDisplayName } from "@/lib/console-branding";

type MeResponse =
  | {
      ok: true;
      user: {
        email?: string | null;
        full_name?: string | null;
        role?: string | null;
        avatar_url?: string | null;
        tenant_id?: string | null;
      };
    }
  | { ok: false; error?: string };

type TenantResponse =
  | {
      ok: true;
      tenant: {
        id: string;
        name: string;
      };
    }
  | { ok: false; error?: string };

type ConsoleIdentityValue = {
  displayName: string;
  email: string | null;
  role: string;
  avatarUrl: string | null;
  workspaceName: string;
  workspaceId: string | null;
  loading: boolean;
};

const DEFAULT_IDENTITY: ConsoleIdentityValue = {
  displayName: "Utilisateur Oniix",
  email: null,
  role: "viewer",
  avatarUrl: null,
  workspaceName: defaultWorkspaceName(null),
  workspaceId: null,
  loading: true,
};

const ConsoleIdentityContext = React.createContext<ConsoleIdentityValue>(DEFAULT_IDENTITY);

export function ConsoleIdentityProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = React.useState<ConsoleIdentityValue>(DEFAULT_IDENTITY);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [meRes, tenantRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/settings/tenant", { cache: "no-store" }).catch(() => null),
        ]);

        const nextValue: ConsoleIdentityValue = {
          ...DEFAULT_IDENTITY,
          loading: false,
        };

        const meJson = (await meRes.json().catch(() => null)) as MeResponse | null;
        if (meRes.ok && meJson && "ok" in meJson && meJson.ok) {
          nextValue.email = meJson.user.email?.trim() || null;
          nextValue.role = (meJson.user.role?.trim() || "viewer").toLowerCase();
          nextValue.avatarUrl = meJson.user.avatar_url?.trim() || null;
          nextValue.workspaceId = meJson.user.tenant_id?.trim() || null;
          nextValue.displayName = deriveDisplayName(meJson.user.full_name, meJson.user.email);
          nextValue.workspaceName = defaultWorkspaceName(nextValue.role);
        }

        if (tenantRes) {
          const tenantJson = (await tenantRes.json().catch(() => null)) as TenantResponse | null;
          if (tenantRes.ok && tenantJson && "ok" in tenantJson && tenantJson.ok) {
            nextValue.workspaceName = tenantJson.tenant.name?.trim() || nextValue.workspaceName;
            nextValue.workspaceId = tenantJson.tenant.id?.trim() || nextValue.workspaceId;
          }
        }

        if (mounted) setValue(nextValue);
      } catch {
        if (mounted) setValue((current) => ({ ...current, loading: false }));
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return <ConsoleIdentityContext.Provider value={value}>{children}</ConsoleIdentityContext.Provider>;
}

export function useConsoleIdentity() {
  return React.useContext(ConsoleIdentityContext);
}

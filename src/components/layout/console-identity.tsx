"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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
      active_tenant_id: string | null;
      workspaces: Array<{
        id: string;
        name: string;
        role: string;
        is_active: boolean;
      }>;
    }
  | { ok: false; error?: string };

type ConsoleIdentityValue = {
  displayName: string;
  email: string | null;
  role: string;
  avatarUrl: string | null;
  workspaceName: string;
  workspaceId: string | null;
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
    isActive: boolean;
  }>;
  loading: boolean;
  switchingWorkspaceId: string | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;
};

const DEFAULT_IDENTITY: ConsoleIdentityValue = {
  displayName: "Utilisateur Oniix",
  email: null,
  role: "viewer",
  avatarUrl: null,
  workspaceName: defaultWorkspaceName(null),
  workspaceId: null,
  workspaces: [],
  loading: true,
  switchingWorkspaceId: null,
  switchWorkspace: async () => {},
};

const ConsoleIdentityContext = React.createContext<ConsoleIdentityValue>(DEFAULT_IDENTITY);

export function ConsoleIdentityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [value, setValue] = React.useState<ConsoleIdentityValue>(DEFAULT_IDENTITY);
  const loadIdentity = React.useCallback(async () => {
    const [meRes, workspacesRes] = await Promise.all([
      fetch("/api/auth/me", { cache: "no-store" }),
      fetch("/api/tenant/workspaces", { cache: "no-store" }).catch(() => null),
    ]);

    const nextValue: ConsoleIdentityValue = {
      ...DEFAULT_IDENTITY,
      loading: false,
      switchingWorkspaceId: null,
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

    if (workspacesRes) {
      const workspacesJson = (await workspacesRes.json().catch(() => null)) as TenantResponse | null;
      if (workspacesRes.ok && workspacesJson && "ok" in workspacesJson && workspacesJson.ok) {
        nextValue.workspaces = workspacesJson.workspaces.map((workspace) => ({
          id: workspace.id.trim(),
          name: workspace.name.trim(),
          role: workspace.role.trim().toLowerCase(),
          isActive: workspace.is_active,
        }));

        const activeWorkspace =
          nextValue.workspaces.find((workspace) => workspace.isActive) ??
          nextValue.workspaces.find((workspace) => workspace.id === nextValue.workspaceId) ??
          null;

        if (activeWorkspace) {
          nextValue.workspaceId = activeWorkspace.id;
          nextValue.workspaceName = activeWorkspace.name || nextValue.workspaceName;
          if (nextValue.role !== "superadmin") {
            nextValue.role = activeWorkspace.role || nextValue.role;
          }
        }
      }
    }

    return nextValue;
  }, []);

  React.useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const nextValue = await loadIdentity();
        if (mounted) setValue(nextValue);
      } catch {
        if (mounted) setValue((current) => ({ ...current, loading: false }));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadIdentity]);

  const switchWorkspace = React.useCallback(
    async (workspaceId: string) => {
      const nextWorkspaceId = workspaceId.trim();
      if (!nextWorkspaceId || nextWorkspaceId === value.workspaceId) return;

      setValue((current) => ({
        ...current,
        switchingWorkspaceId: nextWorkspaceId,
      }));

      try {
        const res = await fetch("/api/tenant/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: nextWorkspaceId }),
        });

        if (!res.ok) {
          throw new Error("Impossible de changer d'espace de travail.");
        }

        const nextValue = await loadIdentity();
        setValue(nextValue);
        router.refresh();
      } catch (error) {
        setValue((current) => ({ ...current, switchingWorkspaceId: null }));
        throw error;
      }
    },
    [loadIdentity, router, value.workspaceId]
  );

  return (
    <ConsoleIdentityContext.Provider
      value={{
        ...value,
        switchWorkspace,
      }}
    >
      {children}
    </ConsoleIdentityContext.Provider>
  );
}

export function useConsoleIdentity() {
  return React.useContext(ConsoleIdentityContext);
}

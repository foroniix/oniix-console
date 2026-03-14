import { createAdminClient, createUserClient } from "./supabase.ts";
import { env } from "./env.ts";

export async function requireTenantEditor(request: Request, tenantId: string) {
  const authorization = request.headers.get("Authorization")?.trim();
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false as const, res: new Response("Unauthorized", { status: 401 }) };
  }

  const userClient = createUserClient(authorization);
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, res: new Response("Unauthorized", { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: membership, error: membershipError } = await admin
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { ok: false as const, res: new Response("Forbidden", { status: 403 }) };
  }

  return {
    ok: true as const,
    user,
    role: String((membership as { role?: string | null }).role ?? "member"),
  };
}

export function requireWorkerSecret(request: Request) {
  const secret = request.headers.get("x-oniix-worker-secret")?.trim();
  if (!secret || secret !== env.workerResolveOriginSecret) {
    return { ok: false as const, res: new Response("Forbidden", { status: 403 }) };
  }
  return { ok: true as const };
}

export function requireJobSecret(request: Request) {
  const secret = request.headers.get("x-oniix-job-secret")?.trim();
  if (!secret || secret !== env.internalJobSecret) {
    return { ok: false as const, res: new Response("Forbidden", { status: 403 }) };
  }
  return { ok: true as const };
}

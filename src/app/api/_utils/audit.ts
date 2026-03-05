import type { SupabaseClient } from "@supabase/supabase-js";

type AuditLogInput = {
  sb: SupabaseClient;
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function auditLog(input: AuditLogInput) {
  const { sb, tenantId, actorUserId, action, targetType, targetId, metadata } = input;

  if (!tenantId || !actorUserId) {
    console.warn("Audit log skipped (missing context)", {
      tenantId,
      actorUserId,
      action,
    });
    return;
  }

  const actorFieldAttempts = ["actor_user_id", "actor_id", "user_id"] as const;
  let lastError: { message: string } | null = null;

  for (const actorField of actorFieldAttempts) {
    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      metadata: metadata ?? {},
      [actorField]: actorUserId,
    };

    const { error } = await sb.from("audit_logs").insert(payload);
    if (!error) return;

    lastError = error;
  }

  if (lastError) {
    console.error("Audit log insert failed", {
      action,
      tenantId,
      actorUserId,
      error: lastError.message,
    });
  }
}

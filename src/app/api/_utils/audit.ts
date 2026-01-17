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

  const { error } = await sb.from("audit_logs").insert({
    tenant_id: tenantId,
    actor_user_id: actorUserId,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error("Audit log insert failed", {
      action,
      tenantId,
      actorUserId,
      error: error.message,
    });
  }
}

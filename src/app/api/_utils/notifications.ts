import type { AuthContext } from "./auth";
import { supabaseAdmin } from "./supabase";

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export type NotificationItem = {
  id: string;
  kind: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionLabel: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  kind: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  action_label: string | null;
  action_url: string | null;
  dedupe_key: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

type SyncNotificationInput = {
  tenantId: string | null;
  kind: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionLabel?: string | null;
  actionUrl?: string | null;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
};

function isMissingTableError(code?: string | null) {
  return code === "42P01" || code === "PGRST205";
}

function stableJson(value: unknown) {
  return JSON.stringify(value ?? {});
}

export function notificationsDiffer(
  current:
    | Pick<
        NotificationRow,
        "severity" | "title" | "body" | "action_label" | "action_url" | "metadata"
      >
    | null,
  next: SyncNotificationInput
) {
  if (!current) return true;
  return (
    current.severity !== next.severity ||
    current.title !== next.title ||
    current.body !== next.body ||
    (current.action_label ?? null) !== (next.actionLabel ?? null) ||
    (current.action_url ?? null) !== (next.actionUrl ?? null) ||
    stableJson(current.metadata) !== stableJson(next.metadata ?? {})
  );
}

export function mapNotificationRow(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    kind: row.kind,
    severity: row.severity,
    title: row.title,
    body: row.body,
    actionLabel: row.action_label ?? null,
    actionUrl: row.action_url ?? null,
    isRead: Boolean(row.is_read),
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

async function syncNotification(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  input: SyncNotificationInput | null
) {
  if (!input) return;

  const { data: existing, error: existingError } = await admin
    .from("user_notifications")
    .select("id,severity,title,body,action_label,action_url,metadata")
    .eq("user_id", userId)
    .eq("dedupe_key", input.dedupeKey)
    .maybeSingle();

  if (existingError && !isMissingTableError(existingError.code)) {
    throw existingError;
  }

  if (!existing) {
    const { error } = await admin.from("user_notifications").insert({
      user_id: userId,
      tenant_id: input.tenantId,
      kind: input.kind,
      severity: input.severity,
      title: input.title,
      body: input.body,
      action_label: input.actionLabel ?? null,
      action_url: input.actionUrl ?? null,
      dedupe_key: input.dedupeKey,
      metadata: input.metadata ?? {},
      is_read: false,
      read_at: null,
    });
    if (error && !isMissingTableError(error.code)) throw error;
    return;
  }

  if (!notificationsDiffer(existing as NotificationRow, input)) return;

  const { error } = await admin
    .from("user_notifications")
    .update({
      tenant_id: input.tenantId,
      kind: input.kind,
      severity: input.severity,
      title: input.title,
      body: input.body,
      action_label: input.actionLabel ?? null,
      action_url: input.actionUrl ?? null,
      metadata: input.metadata ?? {},
      is_read: false,
      read_at: null,
    })
    .eq("user_id", userId)
    .eq("dedupe_key", input.dedupeKey);

  if (error && !isMissingTableError(error.code)) throw error;
}

async function deleteNotification(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  dedupeKey: string
) {
  const { error } = await admin
    .from("user_notifications")
    .delete()
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey);

  if (error && !isMissingTableError(error.code)) throw error;
}

async function countAllRows(
  admin: ReturnType<typeof supabaseAdmin>,
  table: string
) {
  const { count, error } = await admin.from(table).select("id", { count: "exact", head: true });
  if (error) {
    if (isMissingTableError(error.code)) return null;
    throw error;
  }
  return Number(count ?? 0);
}

async function countRowsWhereNull(
  admin: ReturnType<typeof supabaseAdmin>,
  table: string,
  column: string,
  tenantId?: string | null
) {
  let query = admin.from(table).select("id", { count: "exact", head: true }).is(column, null);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { count, error } = await query;
  if (error) {
    if (isMissingTableError(error.code)) return null;
    throw error;
  }
  return Number(count ?? 0);
}

async function countRowsWhereIn(
  admin: ReturnType<typeof supabaseAdmin>,
  table: string,
  column: string,
  values: string[],
  tenantId?: string | null
) {
  let query = admin.from(table).select("id", { count: "exact", head: true }).in(column, values);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { count, error } = await query;
  if (error) {
    if (isMissingTableError(error.code)) return null;
    throw error;
  }
  return Number(count ?? 0);
}

async function countRowsWhereEq(
  admin: ReturnType<typeof supabaseAdmin>,
  table: string,
  column: string,
  value: string
) {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) {
    if (isMissingTableError(error.code)) return null;
    throw error;
  }
  return Number(count ?? 0);
}

export async function syncSystemNotifications(ctx: AuthContext) {
  const admin = supabaseAdmin();
  const role = (ctx.role ?? "").toLowerCase();

  await syncNotification(admin, ctx.userId, {
    tenantId: ctx.tenantId,
    kind: "support_welcome",
    severity: "info",
    title: "Support Oniix disponible",
    body: "Une question produit, un incident ou un besoin d'onboarding ? Écrivez à support@oniix.space.",
    actionLabel: "Contacter le support",
    actionUrl: "mailto:support@oniix.space",
    dedupeKey: "system:support-welcome",
    metadata: { source: "system" },
  });

  if (role === "superadmin") {
    const missingOrigin = await countRowsWhereNull(admin, "channels", "origin_hls_url");
    const missingTenant = await countRowsWhereNull(admin, "channels", "tenant_id");
    const tenantsTotal = await countAllRows(admin, "tenants");
    const ingestConfigured = await countAllRows(admin, "tenant_ingest_keys");

    if ((missingOrigin ?? 0) > 0 || (missingTenant ?? 0) > 0) {
      await syncNotification(admin, ctx.userId, {
        tenantId: null,
        kind: "ott_backfill_required",
        severity: "warning",
        title: "Backfill OTT requis",
        body: `${missingOrigin ?? 0} chaîne(s) sans origine et ${missingTenant ?? 0} chaîne(s) sans tenant bloquent encore une partie du catalogue.`,
        actionLabel: "Ouvrir le backfill",
        actionUrl: "/system/channel-backfill",
        dedupeKey: "superadmin:ott-backfill",
        metadata: { missingOrigin, missingTenant },
      });
    } else {
      await deleteNotification(admin, ctx.userId, "superadmin:ott-backfill");
    }

    if (tenantsTotal !== null && ingestConfigured !== null && ingestConfigured < tenantsTotal) {
      await syncNotification(admin, ctx.userId, {
        tenantId: null,
        kind: "ingest_coverage_gap",
        severity: "warning",
        title: "Couverture ingest incomplète",
        body: `${tenantsTotal - ingestConfigured} tenant(s) n'ont pas encore de configuration ingest active.`,
        actionLabel: "Vérifier la plateforme",
        actionUrl: "/system",
        dedupeKey: "superadmin:ingest-gap",
        metadata: { tenantsTotal, ingestConfigured },
      });
    } else {
      await deleteNotification(admin, ctx.userId, "superadmin:ingest-gap");
    }

    return;
  }

  if (!ctx.tenantId) return;

  const missingOrigin = await countRowsWhereNull(admin, "channels", "origin_hls_url", ctx.tenantId);

  if ((missingOrigin ?? 0) > 0) {
    await syncNotification(admin, ctx.userId, {
      tenantId: ctx.tenantId,
      kind: "tenant_channel_origin_missing",
      severity: "warning",
      title: "Chaînes sans origine HLS",
      body: `${missingOrigin} chaîne(s) de votre tenant n'ont pas encore d'origin_hls_url et ne seront pas lisibles côté app.`,
      actionLabel: "Ouvrir les chaînes",
      actionUrl: "/channels",
      dedupeKey: "tenant:origin-missing",
      metadata: { missingOrigin },
    });
  } else {
    await deleteNotification(admin, ctx.userId, "tenant:origin-missing");
  }

  const healthAlerts = await countRowsWhereIn(
    admin,
    "channel_health",
    "status",
    ["degraded", "down"],
    ctx.tenantId
  );

  if ((healthAlerts ?? 0) > 0) {
    await syncNotification(admin, ctx.userId, {
      tenantId: ctx.tenantId,
      kind: "tenant_channel_health_alert",
      severity: "critical",
      title: "Flux à surveiller",
      body: `${healthAlerts} chaîne(s) présentent actuellement un état degraded/down côté monitoring.`,
      actionLabel: "Voir les chaînes",
      actionUrl: "/channels",
      dedupeKey: "tenant:health-alerts",
      metadata: { healthAlerts },
    });
  } else {
    await deleteNotification(admin, ctx.userId, "tenant:health-alerts");
  }

  const ingestConfigured = await countRowsWhereEq(admin, "tenant_ingest_keys", "tenant_id", ctx.tenantId);

  if (ingestConfigured === 0) {
    await syncNotification(admin, ctx.userId, {
      tenantId: ctx.tenantId,
      kind: "tenant_ingest_missing",
      severity: "info",
      title: "Ingest mobile à finaliser",
      body: "La clé d'ingest mobile n'est pas encore configurée pour ce tenant. Les analytics app resteront incomplets.",
      actionLabel: "Ouvrir les paramètres",
      actionUrl: "/settings",
      dedupeKey: "tenant:ingest-missing",
      metadata: { ingestConfigured },
    });
  } else if (ingestConfigured !== null) {
    await deleteNotification(admin, ctx.userId, "tenant:ingest-missing");
  }
}

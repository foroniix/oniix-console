import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "../../_utils/auth";
import { supabaseAdmin } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIVE_WINDOW_SEC = 35;
const MAX_USERS_PAGES = 20;
const USERS_PAGE_SIZE = 1000;
const MAX_EVENT_SCAN = 50000;

function isMissingTableError(code?: string | null) {
  return code === "42P01" || code === "PGRST205";
}

function normalizeEventType(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function isStopEvent(eventType: string | null | undefined) {
  const t = normalizeEventType(eventType);
  return (
    t === "STOP" ||
    t === "STOP_STREAM" ||
    t === "END" ||
    t === "END_STREAM" ||
    t === "END_VIEW"
  );
}

function isAliveEvent(eventType: string | null | undefined) {
  const t = normalizeEventType(eventType);
  return t === "START_STREAM" || t === "HEARTBEAT";
}

async function listUsersCount(admin: ReturnType<typeof supabaseAdmin>) {
  let page = 1;
  let total = 0;
  while (page <= MAX_USERS_PAGES) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: USERS_PAGE_SIZE,
    });
    if (error) throw error;
    const size = data.users.length;
    total += size;
    if (size < USERS_PAGE_SIZE) break;
    page += 1;
  }
  return total;
}

export async function GET() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const roleErr = requireRole(auth.ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  const admin = supabaseAdmin();
  const now = new Date();
  const nowIso = now.toISOString();
  const since24hIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const since7dIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sinceLiveIso = new Date(now.getTime() - LIVE_WINDOW_SEC * 1000).toISOString();

  const warnings: string[] = [];

  let tenantsTotal = 0;
  let tenantsNew7d = 0;
  let streamsTotal = 0;
  let streamsLive = 0;
  let events24h = 0;
  let usersTotal = 0;
  let ingestConfiguredTenants = 0;
  let liveSessions = 0;

  try {
    const usersCountPromise = listUsersCount(admin).catch(() => 0);

    const tenantsTotalRes = await admin
      .from("tenants")
      .select("id", { count: "exact", head: true });
    if (!tenantsTotalRes.error) {
      tenantsTotal = Number(tenantsTotalRes.count ?? 0);
    } else if (isMissingTableError(tenantsTotalRes.error.code)) {
      warnings.push("Table `tenants` introuvable.");
    } else {
      console.error("Superadmin overview tenants count error", {
        error: tenantsTotalRes.error.message,
        code: tenantsTotalRes.error.code,
      });
    }

    const tenants7dRes = await admin
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7dIso);
    if (!tenants7dRes.error) {
      tenantsNew7d = Number(tenants7dRes.count ?? 0);
    } else if (isMissingTableError(tenants7dRes.error.code)) {
      warnings.push("Champ `created_at` tenant indisponible.");
    }

    const streamsTotalRes = await admin
      .from("streams")
      .select("id", { count: "exact", head: true });
    if (!streamsTotalRes.error) {
      streamsTotal = Number(streamsTotalRes.count ?? 0);
    } else if (isMissingTableError(streamsTotalRes.error.code)) {
      warnings.push("Table `streams` introuvable.");
    }

    const streamsLiveRes = await admin
      .from("streams")
      .select("id", { count: "exact", head: true })
      .eq("status", "LIVE");
    if (!streamsLiveRes.error) {
      streamsLive = Number(streamsLiveRes.count ?? 0);
    }

    const eventsCountRes = await admin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24hIso);
    if (!eventsCountRes.error) {
      events24h = Number(eventsCountRes.count ?? 0);
    } else if (isMissingTableError(eventsCountRes.error.code)) {
      warnings.push("Table `analytics_events` introuvable.");
    }

    const ingestCountRes = await admin
      .from("tenant_ingest_keys")
      .select("tenant_id", { count: "exact", head: true });
    if (!ingestCountRes.error) {
      ingestConfiguredTenants = Number(ingestCountRes.count ?? 0);
    } else if (isMissingTableError(ingestCountRes.error.code)) {
      warnings.push("Table `tenant_ingest_keys` introuvable.");
    }

    const liveSessionsRes = await admin
      .from("viewer_sessions_live")
      .select("session_id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("last_seen_at", sinceLiveIso);
    if (!liveSessionsRes.error) {
      liveSessions = Number(liveSessionsRes.count ?? 0);
    } else if (isMissingTableError(liveSessionsRes.error.code)) {
      const fallbackLiveRes = await admin
        .from("analytics_events")
        .select("session_id,event_type,created_at")
        .gte("created_at", sinceLiveIso)
        .order("created_at", { ascending: true })
        .limit(10000);

      if (!fallbackLiveRes.error) {
        const activeSessions = new Set<string>();
        for (const row of fallbackLiveRes.data ?? []) {
          const sessionId = String((row as { session_id?: unknown }).session_id ?? "").trim();
          if (!sessionId) continue;
          const eventType = (row as { event_type?: string | null }).event_type;
          if (isStopEvent(eventType)) {
            activeSessions.delete(sessionId);
            continue;
          }
          if (isAliveEvent(eventType)) {
            activeSessions.add(sessionId);
          }
        }
        liveSessions = activeSessions.size;
      } else {
        warnings.push("Impossible de calculer les sessions live.");
      }
    }

    usersTotal = await usersCountPromise;

    const eventRowsRes = await admin
      .from("analytics_events")
      .select("tenant_id")
      .gte("created_at", since24hIso)
      .limit(MAX_EVENT_SCAN);

    const tenantEvents = new Map<string, number>();
    if (!eventRowsRes.error) {
      for (const row of eventRowsRes.data ?? []) {
        const tenantId = String((row as { tenant_id?: unknown }).tenant_id ?? "").trim();
        if (!tenantId) continue;
        tenantEvents.set(tenantId, (tenantEvents.get(tenantId) ?? 0) + 1);
      }
    }

    const activeTenants24h = tenantEvents.size;

    const sortedTenantIds = Array.from(tenantEvents.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tenantId]) => tenantId);

    let tenantNameMap = new Map<string, string>();
    if (sortedTenantIds.length > 0) {
      const namesRes = await admin
        .from("tenants")
        .select("id,name")
        .in("id", sortedTenantIds);
      if (!namesRes.error) {
        tenantNameMap = new Map(
          (namesRes.data ?? []).map((row) => [
            String((row as { id?: unknown }).id ?? ""),
            String((row as { name?: unknown }).name ?? "Tenant"),
          ])
        );
      }
    }

    const topTenants = sortedTenantIds.map((tenantId) => {
      const count = tenantEvents.get(tenantId) ?? 0;
      return {
        tenant_id: tenantId,
        name: tenantNameMap.get(tenantId) ?? "Tenant",
        events_24h: count,
        share_pct: events24h > 0 ? Math.round((count / events24h) * 1000) / 10 : 0,
      };
    });

    const recentTenantsRes = await admin
      .from("tenants")
      .select("id,name,created_at,created_by")
      .order("created_at", { ascending: false })
      .limit(8);

    const recentTenants = !recentTenantsRes.error
      ? (recentTenantsRes.data ?? []).map((row) => ({
          id: String((row as { id?: unknown }).id ?? ""),
          name: String((row as { name?: unknown }).name ?? "Tenant"),
          created_at: String((row as { created_at?: unknown }).created_at ?? ""),
          created_by: (row as { created_by?: unknown }).created_by
            ? String((row as { created_by?: unknown }).created_by)
            : null,
        }))
      : [];

    return NextResponse.json(
      {
        ok: true,
        generated_at: nowIso,
        kpis: {
          tenants_total: tenantsTotal,
          tenants_active_24h: activeTenants24h,
          tenants_new_7d: tenantsNew7d,
          users_total: usersTotal,
          streams_total: streamsTotal,
          streams_live: streamsLive,
          events_24h: events24h,
          live_sessions: liveSessions,
          ingest_configured_tenants: ingestConfiguredTenants,
        },
        top_tenants: topTenants,
        recent_tenants: recentTenants,
        warnings,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Superadmin overview error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "../../_utils/auth";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_SCAN_EVENTS = 50000;

function isMissingTableError(code?: string | null) {
  return code === "42P01" || code === "PGRST205";
}

type TenantRow = {
  id: string;
  name: string;
  created_at: string | null;
  created_by: string | null;
};

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const roleErr = requireRole(auth.ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  const admin = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(300, Math.max(10, Number(searchParams.get("limit") ?? "120")));
  const since24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    let tenantsQuery = admin
      .from("tenants")
      .select("id,name,created_at,created_by")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (q) {
      const cleaned = q.replaceAll("%", "").replaceAll("_", "");
      tenantsQuery = tenantsQuery.ilike("name", `%${cleaned}%`);
    }

    const tenantsRes = await tenantsQuery;
    if (tenantsRes.error) {
      if (isMissingTableError(tenantsRes.error.code)) {
        return NextResponse.json(
          { ok: false, error: "Migration manquante: table `tenants` indisponible." },
          { status: 503 }
        );
      }
      console.error("Superadmin tenants list error", {
        error: tenantsRes.error.message,
        code: tenantsRes.error.code,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    const tenants = (tenantsRes.data ?? []) as TenantRow[];
    const tenantIds = tenants.map((tenant) => tenant.id).filter(Boolean);

    const memberCount = new Map<string, number>();
    const streamCount = new Map<string, number>();
    const liveStreamCount = new Map<string, number>();
    const events24hCount = new Map<string, number>();
    const ingestConfigured = new Set<string>();
    const ownerById = new Map<string, { email: string | null; user_id: string }>();

    if (tenantIds.length > 0) {
      const [membersRes, streamsRes, eventsRes, ingestRes] = await Promise.all([
        admin.from("tenant_memberships").select("tenant_id").in("tenant_id", tenantIds),
        admin.from("streams").select("tenant_id,status").in("tenant_id", tenantIds),
        admin
          .from("analytics_events")
          .select("tenant_id")
          .in("tenant_id", tenantIds)
          .gte("created_at", since24hIso)
          .limit(MAX_SCAN_EVENTS),
        admin.from("tenant_ingest_keys").select("tenant_id").in("tenant_id", tenantIds),
      ]);

      if (!membersRes.error) {
        for (const row of membersRes.data ?? []) {
          const tenantId = String((row as { tenant_id?: unknown }).tenant_id ?? "").trim();
          if (!tenantId) continue;
          memberCount.set(tenantId, (memberCount.get(tenantId) ?? 0) + 1);
        }
      }

      if (!streamsRes.error) {
        for (const row of streamsRes.data ?? []) {
          const tenantId = String((row as { tenant_id?: unknown }).tenant_id ?? "").trim();
          if (!tenantId) continue;
          streamCount.set(tenantId, (streamCount.get(tenantId) ?? 0) + 1);
          const status = String((row as { status?: unknown }).status ?? "").toUpperCase();
          if (status === "LIVE") {
            liveStreamCount.set(tenantId, (liveStreamCount.get(tenantId) ?? 0) + 1);
          }
        }
      }

      if (!eventsRes.error) {
        for (const row of eventsRes.data ?? []) {
          const tenantId = String((row as { tenant_id?: unknown }).tenant_id ?? "").trim();
          if (!tenantId) continue;
          events24hCount.set(tenantId, (events24hCount.get(tenantId) ?? 0) + 1);
        }
      }

      if (!ingestRes.error) {
        for (const row of ingestRes.data ?? []) {
          const tenantId = String((row as { tenant_id?: unknown }).tenant_id ?? "").trim();
          if (tenantId) ingestConfigured.add(tenantId);
        }
      }
    }

    const ownerIds = Array.from(
      new Set(
        tenants
          .map((tenant) => tenant.created_by?.trim())
          .filter((value): value is string => Boolean(value))
      )
    );

    await Promise.all(
      ownerIds.map(async (userId) => {
        try {
          const { data, error } = await admin.auth.admin.getUserById(userId);
          if (error) return;
          ownerById.set(userId, { user_id: userId, email: data.user?.email ?? null });
        } catch {
          // ignore owner lookup failures
        }
      })
    );

    const items = tenants.map((tenant) => {
      const tenantId = tenant.id;
      const members = memberCount.get(tenantId) ?? 0;
      const streams = streamCount.get(tenantId) ?? 0;
      const liveStreams = liveStreamCount.get(tenantId) ?? 0;
      const events24h = events24hCount.get(tenantId) ?? 0;
      const owner = tenant.created_by ? ownerById.get(tenant.created_by) ?? null : null;

      return {
        id: tenantId,
        name: tenant.name,
        created_at: tenant.created_at,
        created_by: tenant.created_by,
        owner_email: owner?.email ?? null,
        members_count: members,
        streams_count: streams,
        live_streams_count: liveStreams,
        events_24h: events24h,
        ingest_configured: ingestConfigured.has(tenantId),
        status: events24h > 0 ? "active" : "idle",
      };
    });

    return NextResponse.json(
      {
        ok: true,
        generated_at: new Date().toISOString(),
        total: items.length,
        tenants: items,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Superadmin tenants endpoint error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}

const CREATE_SCHEMA = z.object({
  name: z.string().trim().min(2).max(120),
  ownerEmail: z.string().email().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const roleErr = requireRole(auth.ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  const parsed = await parseJson(req, CREATE_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const admin = supabaseAdmin();

  try {
    const { data: tenant, error: tenantErr } = await admin
      .from("tenants")
      .insert({
        name: parsed.data.name,
        created_by: auth.ctx.userId,
      })
      .select("id,name,created_at,created_by")
      .single();

    if (tenantErr || !tenant) {
      if (tenantErr && isMissingTableError(tenantErr.code)) {
        return NextResponse.json(
          { ok: false, error: "Migration manquante: table `tenants` indisponible." },
          { status: 503 }
        );
      }
      console.error("Superadmin tenant create error", {
        error: tenantErr?.message ?? "unknown",
        code: tenantErr?.code,
      });
      return NextResponse.json({ ok: false, error: "Impossible de creer le tenant." }, { status: 400 });
    }

    let ownerUserId: string | null = null;
    let ownerEmail: string | null = null;

    if (parsed.data.ownerEmail) {
      const inviteRes = await admin.auth.admin.inviteUserByEmail(parsed.data.ownerEmail, {
        data: { role: "tenant_admin", tenant_id: tenant.id },
        redirectTo: process.env.NEXT_PUBLIC_APP_URL,
      });

      if (inviteRes.error) {
        console.error("Superadmin tenant owner invite error", {
          error: inviteRes.error.message,
          tenantId: tenant.id,
          ownerEmail: parsed.data.ownerEmail,
        });
      } else {
        ownerUserId = inviteRes.data.user?.id ?? null;
        ownerEmail = inviteRes.data.user?.email ?? parsed.data.ownerEmail;
      }

      if (ownerUserId) {
        const { error: memberErr } = await admin.from("tenant_memberships").upsert(
          {
            tenant_id: tenant.id,
            user_id: ownerUserId,
            role: "owner",
          },
          { onConflict: "tenant_id,user_id" }
        );

        if (memberErr && !isMissingTableError(memberErr.code)) {
          console.error("Superadmin tenant owner membership error", {
            error: memberErr.message,
            tenantId: tenant.id,
            ownerUserId,
          });
        }

        await admin.auth.admin.updateUserById(ownerUserId, {
          app_metadata: {
            tenant_id: tenant.id,
            role: "tenant_admin",
          },
        });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          created_at: tenant.created_at,
          created_by: tenant.created_by,
        },
        invited_owner: ownerEmail ? { email: ownerEmail, user_id: ownerUserId } : null,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Superadmin tenant create exception", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}

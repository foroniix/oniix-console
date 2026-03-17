import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "../../_utils/auth";
import { generateIngestKey, hashIngestKey } from "../../_utils/analytics-ingest";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_SCAN_EVENTS = 50000;
const ONBOARDING_TOTAL_STEPS = 5;

function isMissingTableError(code?: string | null) {
  return code === "42P01" || code === "PGRST205";
}

function isUniqueViolation(code?: string | null) {
  return code === "23505";
}

function slugify(value: string) {
  const fallback = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return fallback || "channel";
}

function buildOnboardingState(input: {
  ownerConfigured: boolean;
  channelConfigured: boolean;
  originConfigured: boolean;
  streamConfigured: boolean;
  ingestConfigured: boolean;
}) {
  const missingSteps = [
    !input.ownerConfigured ? "owner" : null,
    !input.channelConfigured ? "channel" : null,
    !input.originConfigured ? "source" : null,
    !input.streamConfigured ? "stream" : null,
    !input.ingestConfigured ? "ingest" : null,
  ].filter((step): step is string => Boolean(step));

  const completion = ONBOARDING_TOTAL_STEPS - missingSteps.length;

  return {
    owner_configured: input.ownerConfigured,
    channel_configured: input.channelConfigured,
    origin_configured: input.originConfigured,
    stream_configured: input.streamConfigured,
    ingest_configured: input.ingestConfigured,
    completion,
    total_steps: ONBOARDING_TOTAL_STEPS,
    missing_steps: missingSteps,
    status: completion >= ONBOARDING_TOTAL_STEPS ? "ready" : "setup",
  };
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
    const ownerMembershipByTenant = new Map<string, string>();
    const channelCount = new Map<string, number>();
    const originConfiguredCount = new Map<string, number>();
    const streamCount = new Map<string, number>();
    const liveStreamCount = new Map<string, number>();
    const events24hCount = new Map<string, number>();
    const ingestConfigured = new Set<string>();
    const ownerById = new Map<string, { email: string | null; user_id: string }>();

    if (tenantIds.length > 0) {
      const [membersRes, channelsRes, streamsRes, eventsRes, ingestRes] = await Promise.all([
        admin.from("tenant_memberships").select("tenant_id,user_id,role").in("tenant_id", tenantIds),
        admin.from("channels").select("tenant_id,origin_hls_url").in("tenant_id", tenantIds),
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
          const role = String((row as { role?: unknown }).role ?? "").trim().toLowerCase();
          const userId = String((row as { user_id?: unknown }).user_id ?? "").trim();
          if (role === "owner" && userId && !ownerMembershipByTenant.has(tenantId)) {
            ownerMembershipByTenant.set(tenantId, userId);
          }
        }
      }

      if (!channelsRes.error) {
        for (const row of channelsRes.data ?? []) {
          const tenantId = String((row as { tenant_id?: unknown }).tenant_id ?? "").trim();
          if (!tenantId) continue;
          channelCount.set(tenantId, (channelCount.get(tenantId) ?? 0) + 1);
          const originHlsUrl = String((row as { origin_hls_url?: unknown }).origin_hls_url ?? "").trim();
          if (originHlsUrl) {
            originConfiguredCount.set(tenantId, (originConfiguredCount.get(tenantId) ?? 0) + 1);
          }
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
          .flatMap((tenant) => {
            const ownerMembershipId = ownerMembershipByTenant.get(tenant.id);
            return [ownerMembershipId, tenant.created_by?.trim()].filter(
              (value): value is string => Boolean(value)
            );
          })
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
      const channels = channelCount.get(tenantId) ?? 0;
      const origins = originConfiguredCount.get(tenantId) ?? 0;
      const streams = streamCount.get(tenantId) ?? 0;
      const liveStreams = liveStreamCount.get(tenantId) ?? 0;
      const events24h = events24hCount.get(tenantId) ?? 0;
      const ownerMembershipId = ownerMembershipByTenant.get(tenantId) ?? null;
      const ownerId = ownerMembershipId ?? tenant.created_by;
      const owner = ownerId ? ownerById.get(ownerId) ?? null : null;
      const onboarding = buildOnboardingState({
        ownerConfigured: Boolean(ownerMembershipId),
        channelConfigured: channels > 0,
        originConfigured: origins > 0,
        streamConfigured: streams > 0,
        ingestConfigured: ingestConfigured.has(tenantId),
      });
      const status = events24h > 0 ? "active" : onboarding.status;

      return {
        id: tenantId,
        name: tenant.name,
        created_at: tenant.created_at,
        created_by: tenant.created_by,
        owner_email: owner?.email ?? null,
        members_count: members,
        channels_count: channels,
        origin_configured: origins > 0,
        streams_count: streams,
        live_streams_count: liveStreams,
        events_24h: events24h,
        ingest_configured: ingestConfigured.has(tenantId),
        onboarding_completion: onboarding.completion,
        onboarding_total: onboarding.total_steps,
        missing_steps: onboarding.missing_steps,
        status,
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
  initialChannelName: z.string().trim().min(2).max(120).optional(),
  initialChannelCategory: z.string().trim().min(2).max(80).optional(),
  initialOriginHlsUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  createInitialStream: z.boolean().optional(),
  initialStreamTitle: z.string().trim().min(2).max(120).optional(),
  provisionIngestKey: z.boolean().optional(),
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
    const warnings: string[] = [];

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
    let ownerConfigured = false;

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
        warnings.push("Invitation owner non envoyee.");
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
          warnings.push("Membership owner non cree.");
        } else if (memberErr && isMissingTableError(memberErr.code)) {
          warnings.push("Membership owner non cree: migration tenant_memberships manquante.");
        } else {
          ownerConfigured = true;
        }

        await admin.auth.admin.updateUserById(ownerUserId, {
          app_metadata: {
            tenant_id: tenant.id,
            role: "tenant_admin",
          },
        });
      }
    }

    const wantsInitialChannel = Boolean(
      parsed.data.initialChannelName ||
        (parsed.data.initialOriginHlsUrl ?? "") ||
        parsed.data.createInitialStream
    );
    const originHlsUrl =
      parsed.data.initialOriginHlsUrl === undefined ||
      parsed.data.initialOriginHlsUrl === null ||
      parsed.data.initialOriginHlsUrl === ""
        ? null
        : parsed.data.initialOriginHlsUrl;
    const initialChannelName = (parsed.data.initialChannelName ?? tenant.name).trim();
    const initialChannelCategory = (parsed.data.initialChannelCategory ?? "Autre").trim();

    let createdChannel:
      | {
          id: string;
          name: string;
          slug: string | null;
          category: string | null;
          origin_hls_url: string | null;
        }
      | null = null;

    if (wantsInitialChannel) {
      const channelPayload = {
        tenant_id: tenant.id,
        name: initialChannelName,
        slug: slugify(initialChannelName),
        category: initialChannelCategory,
        active: true,
        is_active: true,
        origin_hls_url: originHlsUrl,
      };

      let channelRes = await admin
        .from("channels")
        .insert(channelPayload)
        .select("id,name,slug,category,origin_hls_url")
        .single();

      if (channelRes.error && isUniqueViolation(channelRes.error.code)) {
        channelRes = await admin
          .from("channels")
          .insert({
            ...channelPayload,
            slug: `${channelPayload.slug}-${tenant.id.slice(0, 8)}`,
          })
          .select("id,name,slug,category,origin_hls_url")
          .single();
      }

      if (channelRes.error || !channelRes.data) {
        console.error("Superadmin tenant initial channel error", {
          error: channelRes.error?.message ?? "unknown",
          code: channelRes.error?.code,
          tenantId: tenant.id,
        });
        warnings.push("Premiere chaine non creee.");
      } else {
        createdChannel = channelRes.data;
      }
    }

    let createdStream:
      | {
          id: string;
          channel_id: string | null;
          title: string;
          status: string | null;
        }
      | null = null;

    if (parsed.data.createInitialStream) {
      if (!createdChannel) {
        warnings.push("Premier stream ignore car la chaine initiale est absente.");
      } else {
        const streamTitle = (parsed.data.initialStreamTitle ?? `${createdChannel.name} Live`).trim();
        const streamRes = await admin
          .from("streams")
          .insert({
            tenant_id: tenant.id,
            channel_id: createdChannel.id,
            title: streamTitle,
            status: "OFFLINE",
          })
          .select("id,channel_id,title,status")
          .single();

        if (streamRes.error || !streamRes.data) {
          console.error("Superadmin tenant initial stream error", {
            error: streamRes.error?.message ?? "unknown",
            code: streamRes.error?.code,
            tenantId: tenant.id,
          });
          warnings.push("Premier stream non cree.");
        } else {
          createdStream = streamRes.data;
        }
      }
    }

    let ingestKey: string | null = null;
    let ingestConfigured = false;

    if (parsed.data.provisionIngestKey) {
      const newKey = generateIngestKey();
      const keyHash = hashIngestKey(newKey);
      const now = new Date().toISOString();
      const ingestRes = await admin.from("tenant_ingest_keys").upsert(
        {
          tenant_id: tenant.id,
          key_hash: keyHash,
          rotated_at: now,
          rotated_by: auth.ctx.userId,
        },
        { onConflict: "tenant_id" }
      );

      if (ingestRes.error) {
        if (isMissingTableError(ingestRes.error.code)) {
          warnings.push("Cle ingest non provisionnee: migration tenant_ingest_keys manquante.");
        } else {
          console.error("Superadmin tenant ingest provision error", {
            error: ingestRes.error.message,
            code: ingestRes.error.code,
            tenantId: tenant.id,
          });
          warnings.push("Cle ingest non provisionnee.");
        }
      } else {
        ingestKey = newKey;
        ingestConfigured = true;
      }
    }

    const onboarding = buildOnboardingState({
      ownerConfigured,
      channelConfigured: Boolean(createdChannel),
      originConfigured: Boolean(createdChannel?.origin_hls_url),
      streamConfigured: Boolean(createdStream),
      ingestConfigured,
    });

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
        onboarding,
        bootstrap: {
          channel: createdChannel,
          stream: createdStream,
          ingest_key: ingestKey,
        },
        warnings,
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

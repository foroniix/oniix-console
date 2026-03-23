import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { parseJson } from "../../_utils/validate";
import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_OPERATOR_CODE = "celtiis-bj";
const DEFAULT_OFFER_CODE = "pilot-tv-sponsored";

const UPSERT_SCHEMA = z.object({
  channel_id: z.string().uuid(),
  stream_id: z.string().uuid().optional().nullable(),
  decision_mode: z.enum(["sponsored", "partner_bypass"]).default("sponsored"),
  allowed_country_iso2: z.string().trim().min(2).max(2).optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
});

const PATCH_SCHEMA = z.object({
  id: z.string().uuid(),
  active: z.boolean().optional(),
  decision_mode: z.enum(["sponsored", "partner_bypass"]).optional(),
  allowed_country_iso2: z.string().trim().min(2).max(2).optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
});

function isMissingTableError(code?: string | null) {
  return code === "42P01" || code === "PGRST205";
}

function clean(value?: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeIso2(value?: string | null) {
  const normalized = clean(value);
  return normalized ? normalized.toUpperCase() : null;
}

type OperatorAccountRow = {
  id: string;
  code: string;
  name: string;
  home_country_iso2?: string | null;
  integration_mode?: string | null;
  active?: boolean | null;
};

type OperatorOfferRow = {
  id: string;
  operator_account_id: string;
  code: string;
  name: string;
  sponsorship_enabled?: boolean | null;
  active?: boolean | null;
};

type ChannelRow = {
  id: string;
  name: string;
  active?: boolean | null;
  is_active?: boolean | null;
};

type StreamRow = {
  id: string;
  title: string;
  channel_id?: string | null;
  status?: string | null;
};

type PolicyRow = {
  id: string;
  tenant_id: string;
  operator_account_id: string;
  operator_offer_id?: string | null;
  channel_id?: string | null;
  stream_id?: string | null;
  active?: boolean | null;
  pilot_scoped?: boolean | null;
  decision_mode?: string | null;
  allowed_country_iso2?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AdminClient = Pick<SupabaseClient, "from">;

async function fetchSponsorshipDomain(admin: AdminClient, tenantId: string) {
  const { data: operator, error: operatorError } = await admin
    .from("operator_accounts")
    .select("id, code, name, home_country_iso2, integration_mode, active")
    .eq("code", DEFAULT_OPERATOR_CODE)
    .maybeSingle();

  if (operatorError) {
    if (isMissingTableError(operatorError.code)) {
      return {
        ok: true as const,
        domainAvailable: false,
        requiresMigration: true,
        operator: null,
        offer: null,
        channels: [],
        streams: [],
        policies: [],
      };
    }

    console.error("Sponsorship settings operator lookup error", {
      error: operatorError.message,
      code: operatorError.code,
      tenantId,
    });
    return { ok: false as const, status: 500, error: "Une erreur est survenue." };
  }

  const operatorRow = (operator as OperatorAccountRow | null) ?? null;
  if (!operatorRow) {
    return {
      ok: true as const,
      domainAvailable: true,
      requiresMigration: false,
      operator: null,
      offer: null,
      channels: [],
      streams: [],
      policies: [],
    };
  }

  const [{ data: offers, error: offersError }, { data: channels, error: channelsError }, { data: streams, error: streamsError }, { data: policies, error: policiesError }] =
    await Promise.all([
      admin
        .from("operator_offers")
        .select("id, operator_account_id, code, name, sponsorship_enabled, active")
        .eq("operator_account_id", operatorRow.id)
        .order("name", { ascending: true }),
      admin
        .from("channels")
        .select("id, name, active, is_active")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true }),
      admin
        .from("streams")
        .select("id, title, channel_id, status")
        .eq("tenant_id", tenantId)
        .order("title", { ascending: true }),
      admin
        .from("sponsorship_policies")
        .select("id, tenant_id, operator_account_id, operator_offer_id, channel_id, stream_id, active, pilot_scoped, decision_mode, allowed_country_iso2, starts_at, ends_at, created_at, updated_at")
        .eq("tenant_id", tenantId)
        .eq("operator_account_id", operatorRow.id)
        .order("created_at", { ascending: false }),
    ]);

  const errors = [offersError, channelsError, streamsError, policiesError].filter(Boolean);
  const fatal = errors.find((error) => error && !isMissingTableError(error.code));
  if (fatal) {
    console.error("Sponsorship settings load error", {
      error: fatal.message,
      code: fatal.code,
      tenantId,
      operatorId: operatorRow.id,
    });
    return { ok: false as const, status: 500, error: "Une erreur est survenue." };
  }

  const offerRow =
    ((offers as OperatorOfferRow[] | null) ?? []).find((entry) => entry.code === DEFAULT_OFFER_CODE) ?? null;

  return {
    ok: true as const,
    domainAvailable: true,
    requiresMigration: false,
    operator: operatorRow,
    offer: offerRow,
    channels: ((channels as ChannelRow[] | null) ?? []).map((channel) => ({
      id: channel.id,
      name: channel.name,
      active: Boolean(channel.active ?? channel.is_active ?? true),
    })),
    streams: ((streams as StreamRow[] | null) ?? []).map((stream) => ({
      id: stream.id,
      title: stream.title,
      channel_id: clean(stream.channel_id),
      status: clean(stream.status) ?? "OFFLINE",
    })),
    policies: ((policies as PolicyRow[] | null) ?? []).map((policy) => ({
      id: policy.id,
      tenant_id: policy.tenant_id,
      operator_account_id: policy.operator_account_id,
      operator_offer_id: clean(policy.operator_offer_id),
      channel_id: clean(policy.channel_id),
      stream_id: clean(policy.stream_id),
      active: Boolean(policy.active ?? true),
      pilot_scoped: Boolean(policy.pilot_scoped ?? true),
      decision_mode: clean(policy.decision_mode) ?? "sponsored",
      allowed_country_iso2: normalizeIso2(policy.allowed_country_iso2),
      starts_at: clean(policy.starts_at),
      ends_at: clean(policy.ends_at),
      created_at: clean(policy.created_at),
      updated_at: clean(policy.updated_at),
    })),
  };
}

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const manageCheck = await requireTenantCapability(
    ctx.sb,
    ctx.tenant_id,
    ctx.user.id,
    "manage_monetization"
  );

  const domain = await fetchSponsorshipDomain(ctx.admin, ctx.tenant_id);
  if (!domain.ok) {
    return jsonError(domain.error, domain.status);
  }

  const channelMap = new Map(domain.channels.map((channel) => [channel.id, channel]));
  const streamMap = new Map(domain.streams.map((stream) => [stream.id, stream]));

  return NextResponse.json(
    {
      ok: true,
      sponsorship: {
        domain_available: domain.domainAvailable,
        requires_migration: domain.requiresMigration,
        can_manage: manageCheck.ok,
        recommended_operator_code: DEFAULT_OPERATOR_CODE,
        mobile_env_hint: `EXPO_PUBLIC_OPERATOR_CODE=${DEFAULT_OPERATOR_CODE}`,
        operator: domain.operator,
        offer: domain.offer,
        available_channels: domain.channels,
        available_streams: domain.streams,
        policies: domain.policies.map((policy) => ({
          ...policy,
          channel_name: policy.channel_id ? channelMap.get(policy.channel_id)?.name ?? null : null,
          stream_title: policy.stream_id ? streamMap.get(policy.stream_id)?.title ?? null : null,
        })),
      },
    },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const manageCheck = await requireTenantCapability(
    ctx.sb,
    ctx.tenant_id,
    ctx.user.id,
    "manage_monetization"
  );
  if (!manageCheck.ok) return jsonError(manageCheck.error, 403);

  const parsed = await parseJson(req, UPSERT_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const channelId = parsed.data.channel_id;
  const streamId = clean(parsed.data.stream_id);
  const allowedCountryIso2 = normalizeIso2(parsed.data.allowed_country_iso2 ?? "BJ");

  const domain = await fetchSponsorshipDomain(ctx.admin, ctx.tenant_id);
  if (!domain.ok) return jsonError(domain.error, domain.status);
  if (!domain.domainAvailable || !domain.operator || !domain.offer) {
    return jsonError("Domaine sponsorship indisponible. Appliquez la migration operateur.", 503);
  }

  const channelExists = domain.channels.some((channel) => channel.id === channelId);
  if (!channelExists) return jsonError("Chaine introuvable dans cet espace.", 404);

  if (streamId) {
    const stream = domain.streams.find((entry) => entry.id === streamId);
    if (!stream) return jsonError("Direct introuvable dans cet espace.", 404);
    if (stream.channel_id && stream.channel_id !== channelId) {
      return jsonError("Le direct selectionne n appartient pas a cette chaine.", 400);
    }
  }

  let existingQuery = ctx.admin
    .from("sponsorship_policies")
    .select("id")
    .eq("tenant_id", ctx.tenant_id)
    .eq("operator_account_id", domain.operator.id)
    .eq("channel_id", channelId);

  existingQuery = streamId ? existingQuery.eq("stream_id", streamId) : existingQuery.is("stream_id", null);

  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) {
    console.error("Sponsorship policy lookup error", {
      error: existingError.message,
      code: existingError.code,
      tenantId: ctx.tenant_id,
      channelId,
      streamId,
    });
    return jsonError("Une erreur est survenue.", 500);
  }

  const payload = {
    tenant_id: ctx.tenant_id,
    operator_account_id: domain.operator.id,
    operator_offer_id: domain.offer.id,
    channel_id: channelId,
    stream_id: streamId,
    active: true,
    pilot_scoped: true,
    decision_mode: parsed.data.decision_mode,
    allowed_country_iso2: allowedCountryIso2,
    starts_at: parsed.data.starts_at ?? null,
    ends_at: parsed.data.ends_at ?? null,
  };

  const write = existing
    ? ctx.admin
        .from("sponsorship_policies")
        .update(payload)
        .eq("id", existing.id)
        .eq("tenant_id", ctx.tenant_id)
        .select("id, tenant_id, operator_account_id, operator_offer_id, channel_id, stream_id, active, pilot_scoped, decision_mode, allowed_country_iso2, starts_at, ends_at, created_at, updated_at")
        .single()
    : ctx.admin
        .from("sponsorship_policies")
        .insert(payload)
        .select("id, tenant_id, operator_account_id, operator_offer_id, channel_id, stream_id, active, pilot_scoped, decision_mode, allowed_country_iso2, starts_at, ends_at, created_at, updated_at")
        .single();

  const { data, error } = await write;
  if (error || !data) {
    console.error("Sponsorship policy write error", {
      error: error?.message ?? "unknown",
      code: error?.code ?? null,
      tenantId: ctx.tenant_id,
      channelId,
      streamId,
    });
    return jsonError("Une erreur est survenue.", 500);
  }

  const channel = domain.channels.find((entry) => entry.id === clean(data.channel_id));
  const stream = domain.streams.find((entry) => entry.id === clean(data.stream_id));

  return NextResponse.json(
    {
      ok: true,
      policy: {
        ...data,
        channel_name: channel?.name ?? null,
        stream_title: stream?.title ?? null,
      },
    },
    { status: 200 }
  );
}

export async function PATCH(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const manageCheck = await requireTenantCapability(
    ctx.sb,
    ctx.tenant_id,
    ctx.user.id,
    "manage_monetization"
  );
  if (!manageCheck.ok) return jsonError(manageCheck.error, 403);

  const parsed = await parseJson(req, PATCH_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const updates: Record<string, unknown> = {};
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;
  if (parsed.data.decision_mode) updates.decision_mode = parsed.data.decision_mode;
  if (parsed.data.allowed_country_iso2 !== undefined) {
    updates.allowed_country_iso2 = normalizeIso2(parsed.data.allowed_country_iso2);
  }
  if (parsed.data.starts_at !== undefined) updates.starts_at = parsed.data.starts_at;
  if (parsed.data.ends_at !== undefined) updates.ends_at = parsed.data.ends_at;

  if (Object.keys(updates).length === 0) {
    return jsonError("Aucune modification a appliquer.", 400);
  }

  const { data, error } = await ctx.admin
    .from("sponsorship_policies")
    .update(updates)
    .eq("id", parsed.data.id)
    .eq("tenant_id", ctx.tenant_id)
    .select("id, tenant_id, operator_account_id, operator_offer_id, channel_id, stream_id, active, pilot_scoped, decision_mode, allowed_country_iso2, starts_at, ends_at, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("Sponsorship policy patch error", {
      error: error?.message ?? "unknown",
      code: error?.code ?? null,
      tenantId: ctx.tenant_id,
      policyId: parsed.data.id,
    });
    return jsonError("Une erreur est survenue.", 500);
  }

  return NextResponse.json({ ok: true, policy: data }, { status: 200 });
}

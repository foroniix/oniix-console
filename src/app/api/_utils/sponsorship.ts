import type { SupabaseClient } from "@supabase/supabase-js";

const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

export type SponsorshipStatus =
  | "not_eligible"
  | "sponsored"
  | "partner_bypass"
  | "operator_unavailable";

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

type SponsorshipPolicyRow = {
  id: string;
  tenant_id: string;
  operator_account_id: string;
  operator_offer_id?: string | null;
  channel_id?: string | null;
  stream_id?: string | null;
  active?: boolean | null;
  decision_mode?: "sponsored" | "partner_bypass" | null;
  allowed_country_iso2?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type SponsorshipDecision = {
  eligible: boolean;
  status: SponsorshipStatus;
  reason: string;
  operatorId: string | null;
  operatorCode: string | null;
  operatorName: string | null;
  offerId: string | null;
  offerCode: string | null;
  policyId: string | null;
  correlationId: string;
};

function clean(value?: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOperatorCode(value?: string | null) {
  const normalized = clean(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeIso2(value?: string | null) {
  const normalized = clean(value);
  return normalized ? normalized.toUpperCase() : null;
}

function isMissingTableError(code?: string | null) {
  return MISSING_TABLE_CODES.has(code ?? "");
}

function isActive(flag?: boolean | null) {
  return Boolean(flag ?? true);
}

function buildCorrelationId() {
  return `op-${Date.now()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function parseTime(value?: string | null) {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

function baseDecision(
  correlationId: string,
  status: SponsorshipStatus,
  reason: string
): SponsorshipDecision {
  return {
    eligible: status === "sponsored" || status === "partner_bypass",
    status,
    reason,
    operatorId: null,
    operatorCode: null,
    operatorName: null,
    offerId: null,
    offerCode: null,
    policyId: null,
    correlationId,
  };
}

export function chooseSponsorshipDecision(input: {
  operatorCode?: string | null;
  countryIso2?: string | null;
  tenantId: string;
  channelId: string;
  streamId?: string | null;
  nowIso?: string;
  operator: OperatorAccountRow | null;
  offers: OperatorOfferRow[];
  policies: SponsorshipPolicyRow[];
  correlationId?: string;
}): SponsorshipDecision {
  const correlationId = input.correlationId ?? buildCorrelationId();
  const operatorCode = normalizeOperatorCode(input.operatorCode);
  const countryIso2 = normalizeIso2(input.countryIso2);

  if (!operatorCode) {
    return baseDecision(correlationId, "not_eligible", "operator_not_provided");
  }

  const operator = input.operator;
  if (!operator) {
    const decision = baseDecision(correlationId, "not_eligible", "operator_unknown");
    decision.operatorCode = operatorCode;
    return decision;
  }

  if (!isActive(operator.active)) {
    const decision = baseDecision(correlationId, "not_eligible", "operator_inactive");
    decision.operatorId = operator.id;
    decision.operatorCode = operator.code;
    decision.operatorName = operator.name;
    return decision;
  }

  const now = parseTime(input.nowIso ?? new Date().toISOString()) ?? Date.now();

  const matchingPolicies = input.policies.filter((policy) => {
    if (!isActive(policy.active)) return false;
    if (policy.tenant_id !== input.tenantId) return false;
    if (policy.operator_account_id !== operator.id) return false;

    const policyChannelId = clean(policy.channel_id);
    if (policyChannelId && policyChannelId !== input.channelId) return false;

    const policyStreamId = clean(policy.stream_id);
    if (policyStreamId && policyStreamId !== clean(input.streamId)) return false;

    const allowedCountryIso2 = normalizeIso2(policy.allowed_country_iso2);
    if (allowedCountryIso2 && countryIso2 && allowedCountryIso2 !== countryIso2) return false;
    if (allowedCountryIso2 && !countryIso2) return false;

    const startsAt = parseTime(policy.starts_at);
    if (startsAt && startsAt > now) return false;

    const endsAt = parseTime(policy.ends_at);
    if (endsAt && endsAt < now) return false;

    return true;
  });

  if (matchingPolicies.length === 0) {
    const reason = countryIso2 ? "policy_not_found" : "country_unavailable";
    return {
      ...baseDecision(correlationId, "not_eligible", reason),
      operatorId: operator.id,
      operatorCode: operator.code,
      operatorName: operator.name,
    };
  }

  const policy = matchingPolicies[0];
  const offer = input.offers.find((entry) => entry.id === clean(policy.operator_offer_id)) ?? null;

  if (offer && (!isActive(offer.active) || !Boolean(offer.sponsorship_enabled ?? true))) {
    return {
      ...baseDecision(correlationId, "not_eligible", "offer_inactive"),
      operatorId: operator.id,
      operatorCode: operator.code,
      operatorName: operator.name,
      offerId: offer.id,
      offerCode: offer.code,
      policyId: policy.id,
    };
  }

  const status: SponsorshipStatus =
    policy.decision_mode === "partner_bypass" ? "partner_bypass" : "sponsored";

  return {
    eligible: true,
    status,
    reason: status === "partner_bypass" ? "policy_partner_bypass" : "policy_match",
    operatorId: operator.id,
    operatorCode: operator.code,
    operatorName: operator.name,
    offerId: offer?.id ?? clean(policy.operator_offer_id),
    offerCode: offer?.code ?? null,
    policyId: policy.id,
    correlationId,
  };
}

export async function resolveSponsorshipDecision(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    channelId: string;
    streamId?: string | null;
    operatorCode?: string | null;
    countryIso2?: string | null;
    nowIso?: string;
  }
): Promise<SponsorshipDecision> {
  const correlationId = buildCorrelationId();
  const operatorCode = normalizeOperatorCode(input.operatorCode);

  if (!operatorCode) {
    return chooseSponsorshipDecision({
      ...input,
      operatorCode,
      operator: null,
      offers: [],
      policies: [],
      correlationId,
    });
  }

  const { data: operator, error: operatorError } = await admin
    .from("operator_accounts")
    .select("id, code, name, home_country_iso2, integration_mode, active")
    .eq("code", operatorCode)
    .maybeSingle();

  if (operatorError) {
    if (isMissingTableError(operatorError.code)) {
      return baseDecision(correlationId, "operator_unavailable", "operator_domain_unavailable");
    }
    console.error("Sponsorship operator lookup error", {
      error: operatorError.message,
      code: operatorError.code,
      operatorCode,
    });
    return baseDecision(correlationId, "operator_unavailable", "operator_lookup_failed");
  }

  const operatorRow = (operator as OperatorAccountRow | null) ?? null;
  if (!operatorRow) {
    return chooseSponsorshipDecision({
      ...input,
      operatorCode,
      operator: null,
      offers: [],
      policies: [],
      correlationId,
    });
  }

  const [{ data: offers, error: offersError }, { data: policies, error: policiesError }] =
    await Promise.all([
      admin
        .from("operator_offers")
        .select("id, operator_account_id, code, name, sponsorship_enabled, active")
        .eq("operator_account_id", operatorRow.id),
      admin
        .from("sponsorship_policies")
        .select(
          "id, tenant_id, operator_account_id, operator_offer_id, channel_id, stream_id, active, decision_mode, allowed_country_iso2, starts_at, ends_at"
        )
        .eq("tenant_id", input.tenantId)
        .eq("operator_account_id", operatorRow.id)
        .eq("active", true),
    ]);

  if (offersError && !isMissingTableError(offersError.code)) {
    console.error("Sponsorship offers lookup error", {
      error: offersError.message,
      code: offersError.code,
      operatorId: operatorRow.id,
    });
    return baseDecision(correlationId, "operator_unavailable", "offer_lookup_failed");
  }

  if (policiesError) {
    if (isMissingTableError(policiesError.code)) {
      return baseDecision(correlationId, "operator_unavailable", "sponsorship_domain_unavailable");
    }
    console.error("Sponsorship policies lookup error", {
      error: policiesError.message,
      code: policiesError.code,
      tenantId: input.tenantId,
      operatorId: operatorRow.id,
    });
    return baseDecision(correlationId, "operator_unavailable", "policy_lookup_failed");
  }

  return chooseSponsorshipDecision({
    ...input,
    operatorCode,
    operator: operatorRow,
    offers:
      ((offers as OperatorOfferRow[] | null) ?? []).filter(
        (entry) => entry.operator_account_id === operatorRow.id
      ),
    policies: (policies as SponsorshipPolicyRow[] | null) ?? [],
    correlationId,
  });
}

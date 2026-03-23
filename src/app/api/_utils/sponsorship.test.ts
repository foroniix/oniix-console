import { describe, expect, it } from "vitest";
import { chooseSponsorshipDecision } from "./sponsorship";

describe("chooseSponsorshipDecision", () => {
  it("returns not eligible when operator is missing", () => {
    const decision = chooseSponsorshipDecision({
      tenantId: "tenant-1",
      channelId: "channel-1",
      operator: null,
      offers: [],
      policies: [],
      correlationId: "corr-1",
    });

    expect(decision.status).toBe("not_eligible");
    expect(decision.reason).toBe("operator_not_provided");
    expect(decision.eligible).toBe(false);
  });

  it("returns sponsored when an active policy matches the tenant and channel", () => {
    const decision = chooseSponsorshipDecision({
      tenantId: "tenant-1",
      channelId: "channel-1",
      operatorCode: "celtiis-bj",
      countryIso2: "BJ",
      correlationId: "corr-2",
      operator: {
        id: "operator-1",
        code: "celtiis-bj",
        name: "Celtiis Benin",
        active: true,
      },
      offers: [
        {
          id: "offer-1",
          operator_account_id: "operator-1",
          code: "pilot-tv-sponsored",
          name: "Pilot TV sponsorise",
          sponsorship_enabled: true,
          active: true,
        },
      ],
      policies: [
        {
          id: "policy-1",
          tenant_id: "tenant-1",
          operator_account_id: "operator-1",
          operator_offer_id: "offer-1",
          channel_id: "channel-1",
          decision_mode: "sponsored",
          allowed_country_iso2: "BJ",
          active: true,
        },
      ],
    });

    expect(decision.status).toBe("sponsored");
    expect(decision.reason).toBe("policy_match");
    expect(decision.operatorCode).toBe("celtiis-bj");
    expect(decision.offerCode).toBe("pilot-tv-sponsored");
    expect(decision.policyId).toBe("policy-1");
    expect(decision.eligible).toBe(true);
  });

  it("rejects a policy when the country is missing", () => {
    const decision = chooseSponsorshipDecision({
      tenantId: "tenant-1",
      channelId: "channel-1",
      operatorCode: "celtiis-bj",
      correlationId: "corr-3",
      operator: {
        id: "operator-1",
        code: "celtiis-bj",
        name: "Celtiis Benin",
        active: true,
      },
      offers: [],
      policies: [
        {
          id: "policy-1",
          tenant_id: "tenant-1",
          operator_account_id: "operator-1",
          channel_id: "channel-1",
          decision_mode: "sponsored",
          allowed_country_iso2: "BJ",
          active: true,
        },
      ],
    });

    expect(decision.status).toBe("not_eligible");
    expect(decision.reason).toBe("country_unavailable");
  });

  it("returns partner_bypass when the matching policy requires it", () => {
    const decision = chooseSponsorshipDecision({
      tenantId: "tenant-1",
      channelId: "channel-1",
      operatorCode: "celtiis-bj",
      countryIso2: "BJ",
      correlationId: "corr-4",
      operator: {
        id: "operator-1",
        code: "celtiis-bj",
        name: "Celtiis Benin",
        active: true,
      },
      offers: [],
      policies: [
        {
          id: "policy-1",
          tenant_id: "tenant-1",
          operator_account_id: "operator-1",
          channel_id: "channel-1",
          decision_mode: "partner_bypass",
          allowed_country_iso2: "BJ",
          active: true,
        },
      ],
    });

    expect(decision.status).toBe("partner_bypass");
    expect(decision.reason).toBe("policy_partner_bypass");
    expect(decision.eligible).toBe(true);
  });
});

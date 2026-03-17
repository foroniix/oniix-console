import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";
import { requireAdRuntimeAuth } from "../_runtime-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Placement = "PLAYER_START" | "EVERY_X_MIN" | "ON_EVENT" | "MANUAL_TRIGGER";
type CreativeFormat = "OVERLAY" | "PREROLL" | "BANNER";

type CampaignRow = {
  id: string;
  type: string | null;
  status: string | null;
  active: boolean | null;
  name: string | null;
  priority: number | null;
  starts_at: string | null;
  ends_at: string | null;
  country_allow: string[] | null;
  country_block: string[] | null;
};

type RuleRow = {
  id: string;
  campaign_id: string;
  placement: Placement | null;
  frequency_sec: number | null;
  stream_id: string | null;
  channel_id: string | null;
  device_allow: string[] | null;
  device_block: string[] | null;
};

type CreativeRow = {
  id: string;
  campaign_id: string;
  media_type: string | null;
  media_url: string | null;
  click_url: string | null;
  active: boolean | null;
};

type DecideResponse =
  | { show: false; reason?: string }
  | {
      show: true;
      campaign: { id: string; type: string; name: string; priority: number };
      placement: Placement;
      creative: {
        id: string;
        format: CreativeFormat;
        asset_url: string;
        cta_url: string | null;
      };
    };

const REQUEST_SCHEMA = z.object({
  placement: z.enum(["PLAYER_START", "EVERY_X_MIN", "ON_EVENT", "MANUAL_TRIGGER"]),
  stream_id: z.string().optional().nullable(),
  channel_id: z.string().optional().nullable(),
  device: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  session_id: z.string().optional().nullable(),
  format: z.enum(["OVERLAY", "PREROLL", "BANNER"]).optional().nullable(),
});

function normalizeDevice(v: unknown): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  return s ? s : null;
}

function normalizeCountry(v: unknown): string | null {
  const s = String(v ?? "").trim().toUpperCase();
  return s && s.length <= 3 ? s : null;
}

function normalizeId(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s || s === "undefined" || s === "null") return null;
  return s;
}

function resolveFormat(placement: Placement, requested?: CreativeFormat | null): CreativeFormat {
  if (requested) return requested;
  if (placement === "PLAYER_START") return "OVERLAY";
  if (placement === "EVERY_X_MIN") return "OVERLAY";
  return "OVERLAY";
}

function isCampaignActive(row: CampaignRow, now: Date) {
  if (row.active === false) return false;
  const status = String(row.status ?? "").trim().toLowerCase();
  if (status && status !== "active") return false;

  const startsAt = row.starts_at ? new Date(row.starts_at) : null;
  const endsAt = row.ends_at ? new Date(row.ends_at) : null;
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

function isAllowedDevice(rule: RuleRow, device: string | null): boolean {
  const allow = Array.isArray(rule.device_allow) ? rule.device_allow : null;
  const block = Array.isArray(rule.device_block) ? rule.device_block : null;

  if (!device) return true;
  if (block && block.map((value) => String(value).toLowerCase()).includes(device)) return false;
  if (allow && allow.length > 0) {
    return allow.map((value) => String(value).toLowerCase()).includes(device);
  }
  return true;
}

function isAllowedCountry(campaign: CampaignRow, country: string | null): boolean {
  const allow = Array.isArray(campaign.country_allow) ? campaign.country_allow : null;
  const block = Array.isArray(campaign.country_block) ? campaign.country_block : null;

  if (!country) return true;
  if (block && block.map((value) => String(value).toUpperCase()).includes(country)) return false;
  if (allow && allow.length > 0) {
    return allow.map((value) => String(value).toUpperCase()).includes(country);
  }
  return true;
}

async function passesFrequencyCap(args: {
  admin: ReturnType<typeof supabaseAdmin>;
  tenantId: string;
  campaignId: string;
  placement: Placement;
  sessionId: string | null;
  frequencySec: number | null;
}): Promise<boolean> {
  const { admin, tenantId, campaignId, placement, sessionId, frequencySec } = args;
  if (!sessionId) return true;
  if (!frequencySec || frequencySec <= 0) return true;

  const since = new Date(Date.now() - frequencySec * 1000).toISOString();

  const { data, error } = await admin
    .from("ad_events")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("campaign_id", campaignId)
    .eq("placement", placement)
    .eq("event", "IMPRESSION")
    .eq("session_id", sessionId)
    .gte("created_at", since)
    .limit(1);

  if (error) return true;
  return !data || data.length === 0;
}

export async function POST(req: Request) {
  const auth = await requireAdRuntimeAuth(req, "manage_monetization");
  if (!auth.ok) return auth.res;

  const parsed = await parseJson(req, REQUEST_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const placement = parsed.data.placement;
  const scopedStreamId = normalizeId(auth.streamId);
  const requestedStreamId = normalizeId(parsed.data.stream_id);
  if (scopedStreamId && requestedStreamId && requestedStreamId !== scopedStreamId) {
    return NextResponse.json({ ok: false, error: "Authentification ingest invalide." }, { status: 401 });
  }

  const stream_id = requestedStreamId ?? scopedStreamId;
  const channel_id = normalizeId(parsed.data.channel_id);
  const session_id = normalizeId(parsed.data.session_id);
  const device = normalizeDevice(parsed.data.device);
  const country = normalizeCountry(parsed.data.country);
  const format = resolveFormat(placement, parsed.data.format);

  const admin = supabaseAdmin();
  const now = new Date();

  const { data: campaigns, error: campaignsError } = await admin
    .from("ad_campaigns")
    .select("id,type,status,active,name,priority,starts_at,ends_at,country_allow,country_block")
    .eq("tenant_id", auth.tenantId)
    .order("priority", { ascending: false })
    .limit(200);

  if (campaignsError) {
    console.error("Ad decide campaigns error", {
      error: campaignsError.message,
      tenantId: auth.tenantId,
    });
    return NextResponse.json({ show: false, reason: "indisponible" } satisfies DecideResponse, { status: 200 });
  }

  const activeCampaigns = ((campaigns ?? []) as CampaignRow[]).filter(
    (campaign) => isCampaignActive(campaign, now) && isAllowedCountry(campaign, country)
  );

  if (activeCampaigns.length === 0) {
    return NextResponse.json(
      { show: false, reason: "Aucune campagne active." } satisfies DecideResponse,
      { status: 200 }
    );
  }

  const campaignIds = activeCampaigns.map((campaign) => campaign.id);

  const { data: rules, error: rulesError } = await admin
    .from("ad_rules")
    .select("id,campaign_id,placement,frequency_sec,stream_id,channel_id,device_allow,device_block")
    .eq("tenant_id", auth.tenantId)
    .eq("placement", placement)
    .in("campaign_id", campaignIds)
    .limit(500);

  if (rulesError) {
    console.error("Ad decide rules error", { error: rulesError.message, tenantId: auth.tenantId });
    return NextResponse.json({ show: false, reason: "indisponible" } satisfies DecideResponse, { status: 200 });
  }

  const { data: creatives, error: creativesError } = await admin
    .from("ad_creatives")
    .select("id,campaign_id,media_type,media_url,click_url,active")
    .eq("tenant_id", auth.tenantId)
    .eq("active", true)
    .in("campaign_id", campaignIds)
    .limit(1000);

  if (creativesError) {
    console.error("Ad decide creatives error", {
      error: creativesError.message,
      tenantId: auth.tenantId,
    });
    return NextResponse.json({ show: false, reason: "indisponible" } satisfies DecideResponse, { status: 200 });
  }

  const creativesByCampaign = new Map<string, CreativeRow[]>();
  for (const creative of (creatives ?? []) as CreativeRow[]) {
    if (!creative.media_url || creative.active === false) continue;
    if (!creativesByCampaign.has(creative.campaign_id)) creativesByCampaign.set(creative.campaign_id, []);
    creativesByCampaign.get(creative.campaign_id)?.push(creative);
  }

  const typedRules = (rules ?? []) as RuleRow[];

  for (const campaign of activeCampaigns) {
    const campaignRules = typedRules.filter((rule) => rule.campaign_id === campaign.id);
    if (campaignRules.length === 0) continue;

    const matchingRule = campaignRules.find((rule) => {
      if (rule.stream_id && stream_id && rule.stream_id !== stream_id) return false;
      if (rule.stream_id && !stream_id) return false;
      if (rule.channel_id && channel_id && rule.channel_id !== channel_id) return false;
      if (rule.channel_id && !channel_id) return false;
      if (!isAllowedDevice(rule, device)) return false;
      return true;
    });
    if (!matchingRule) continue;

    const candidates = creativesByCampaign.get(campaign.id) ?? [];
    if (candidates.length === 0) continue;

    const okFreq = await passesFrequencyCap({
      admin,
      tenantId: auth.tenantId,
      campaignId: campaign.id,
      placement,
      sessionId: session_id,
      frequencySec:
        typeof matchingRule.frequency_sec === "number" ? matchingRule.frequency_sec : null,
    });
    if (!okFreq) continue;

    const creative = candidates[0];

    return NextResponse.json(
      {
        show: true,
        campaign: {
          id: campaign.id,
          type: campaign.type ?? "HOUSE",
          name: campaign.name ?? "Campaign",
          priority: Number(campaign.priority ?? 0),
        },
        placement,
        creative: {
          id: creative.id,
          format,
          asset_url: creative.media_url as string,
          cta_url: creative.click_url ?? null,
        },
      } satisfies DecideResponse,
      { status: 200 }
    );
  }

  return NextResponse.json(
    { show: false, reason: "Aucune creation disponible." } satisfies DecideResponse,
    { status: 200 }
  );
}

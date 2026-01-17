import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Placement = "PLAYER_START" | "EVERY_X_MIN" | "ON_EVENT" | "MANUAL_TRIGGER";
type CreativeFormat = "OVERLAY" | "PREROLL" | "BANNER";

type DecideRequest = {
  placement: Placement;
  stream_id?: string | null;
  channel_id?: string | null;
  device?: string | null; // mobile | desktop | tablet ...
  country?: string | null; // ISO2
  session_id?: string | null; // used for frequency caps
  format?: CreativeFormat | null; // optional override
};

type Creative = {
  id: string;
  format: CreativeFormat;
  asset_url: string;
  thumb_url?: string | null;
  headline?: string | null;
  body?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  duration_sec?: number | null;
};

type DecideResponse =
  | { show: false; reason?: string }
  | {
      show: true;
      campaign: { id: string; type: string; name: string; priority: number };
      placement: Placement;
      creative: Creative;
    };

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

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
  // Default mapping (tu peux faire PREROLL plus tard)
  if (placement === "PLAYER_START") return "OVERLAY";
  if (placement === "EVERY_X_MIN") return "OVERLAY";
  return "OVERLAY";
}

function isAllowedDevice(rule: any, device: string | null): boolean {
  const allow: string[] | null = Array.isArray(rule?.device_allow) ? rule.device_allow : null;
  const block: string[] | null = Array.isArray(rule?.device_block) ? rule.device_block : null;

  if (!device) return true;
  if (block && block.map((x) => String(x).toLowerCase()).includes(device)) return false;
  if (allow && allow.length > 0) {
    return allow.map((x) => String(x).toLowerCase()).includes(device);
  }
  return true;
}

function isAllowedCountry(campaign: any, country: string | null): boolean {
  const allow: string[] | null = Array.isArray(campaign?.country_allow) ? campaign.country_allow : null;
  const block: string[] | null = Array.isArray(campaign?.country_block) ? campaign.country_block : null;

  if (!country) return true;
  if (block && block.map((x) => String(x).toUpperCase()).includes(country)) return false;
  if (allow && allow.length > 0) {
    return allow.map((x) => String(x).toUpperCase()).includes(country);
  }
  return true;
}

function isInWindow(campaign: any, now: Date): boolean {
  const s = campaign?.starts_at ? new Date(campaign.starts_at) : null;
  const e = campaign?.ends_at ? new Date(campaign.ends_at) : null;
  if (s && now < s) return false;
  if (e && now > e) return false;
  return true;
}

/**
 * Frequency cap:
 * If rule.frequency_sec is set and session_id is provided, ensure no IMPRESSION
 * in the last frequency_sec for (campaign, placement, session_id).
 */
async function passesFrequencyCap(args: {
  sb: ReturnType<typeof supabaseUser>;
  campaignId: string;
  placement: Placement;
  sessionId: string | null;
  frequencySec: number | null;
}): Promise<boolean> {
  const { sb, campaignId, placement, sessionId, frequencySec } = args;
  if (!sessionId) return true;
  if (!frequencySec || frequencySec <= 0) return true;

  const since = new Date(Date.now() - frequencySec * 1000).toISOString();

  const { data, error } = await sb
    .from("ad_events")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("placement", placement)
    .eq("event", "IMPRESSION")
    .eq("session_id", sessionId)
    .gte("created_at", since)
    .limit(1);

  // si tracking pas prêt, on bloque pas l’affichage
  if (error) return true;

  return !data || data.length === 0;
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const ctx = auth.ctx;
  const tenantRes = await requireTenant(ctx);
  if (tenantRes) return tenantRes;

  const parsed = await parseJson(
    req,
    z.object({
      placement: z.string().min(1),
      stream_id: z.string().optional().nullable(),
      channel_id: z.string().optional().nullable(),
      device: z.string().optional().nullable(),
      country: z.string().optional().nullable(),
      session_id: z.string().optional().nullable(),
      format: z.string().optional().nullable(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data as DecideRequest;

  const placement = body.placement as Placement;
  if (!placement) return badRequest("Donnees invalides.");
  if (!["PLAYER_START", "EVERY_X_MIN", "ON_EVENT", "MANUAL_TRIGGER"].includes(placement)) {
    return badRequest("Donnees invalides.");
  }

  const stream_id = normalizeId(body.stream_id);
  const channel_id = normalizeId(body.channel_id);
  const session_id = normalizeId(body.session_id);
  const device = normalizeDevice(body.device);
  const country = normalizeCountry(body.country);

  const format = resolveFormat(placement, (body.format as CreativeFormat | null) ?? null);

  const sb = supabaseUser(ctx.accessToken);
  const now = new Date();

  // 1) ACTIVE campaigns (RLS tenant)
  const { data: campaigns, error: campErr } = await sb
    .from("ad_campaigns")
    .select("id, type, status, name, priority, starts_at, ends_at, country_allow, country_block")
    .eq("status", "ACTIVE")
    .order("priority", { ascending: false })
    .limit(200);

  if (campErr) {
    console.error("Ad decide campaigns error", { error: campErr.message, tenantId: ctx.tenantId });
    return NextResponse.json({ show: false, reason: "indisponible" } satisfies DecideResponse, { status: 200 });
  }

  const activeCampaigns = (campaigns ?? []).filter(
    (c: any) => isInWindow(c, now) && isAllowedCountry(c, country)
  );

  if (activeCampaigns.length === 0) {
    return NextResponse.json(
      { show: false, reason: "Aucune campagne active." } satisfies DecideResponse,
      { status: 200 }
    );
  }

  const campaignIds = activeCampaigns.map((c: any) => c.id);

  // 2) Rules for placement
  const { data: rules, error: ruleErr } = await sb
    .from("ad_rules")
    .select("id, campaign_id, placement, frequency_sec, stream_id, channel_id, device_allow, device_block")
    .eq("placement", placement)
    .in("campaign_id", campaignIds)
    .limit(500);

  if (ruleErr) {
    console.error("Ad decide rules error", { error: ruleErr.message, tenantId: ctx.tenantId });
    return NextResponse.json({ show: false, reason: "indisponible" } satisfies DecideResponse, { status: 200 });
  }

  // 3) Active creatives for campaigns
  const { data: creatives, error: creErr } = await sb
    .from("ad_creatives")
    .select("id, campaign_id, format, asset_url, thumb_url, headline, body, cta_label, cta_url, duration_sec, is_active")
    .eq("is_active", true)
    .in("campaign_id", campaignIds)
    .eq("format", format)
    .limit(1000);

  if (creErr) {
    console.error("Ad decide creatives error", { error: creErr.message, tenantId: ctx.tenantId });
    return NextResponse.json({ show: false, reason: "indisponible" } satisfies DecideResponse, { status: 200 });
  }

  const creativesByCampaign = new Map<string, any[]>();
  for (const cr of creatives ?? []) {
    const cid = (cr as any).campaign_id;
    if (!creativesByCampaign.has(cid)) creativesByCampaign.set(cid, []);
    creativesByCampaign.get(cid)!.push(cr);
  }

  // 4) Choose by campaign priority (desc)
  for (const campaign of activeCampaigns) {
    const campaignId = campaign.id;
    const campaignRules = (rules ?? []).filter((r: any) => r.campaign_id === campaignId);
    if (campaignRules.length === 0) continue;

    const matchingRule = campaignRules.find((r: any) => {
      if (r.stream_id && stream_id && r.stream_id !== stream_id) return false;
      if (r.stream_id && !stream_id) return false;
      if (r.channel_id && channel_id && r.channel_id !== channel_id) return false;
      if (r.channel_id && !channel_id) return false;
      if (!isAllowedDevice(r, device)) return false;
      return true;
    });
    if (!matchingRule) continue;

    const cands = creativesByCampaign.get(campaignId) ?? [];
    if (cands.length === 0) continue;

    const frequencySec = typeof matchingRule.frequency_sec === "number" ? matchingRule.frequency_sec : null;
    const okFreq = await passesFrequencyCap({
      sb,
      campaignId,
      placement,
      sessionId: session_id,
      frequencySec,
    });
    if (!okFreq) continue;

    // pick first creative (on randomisera plus tard)
    const creative = cands[0];

    const res: DecideResponse = {
      show: true,
      campaign: {
        id: campaign.id,
        type: campaign.type,
        name: campaign.name,
        priority: Number(campaign.priority ?? 0),
      },
      placement,
      creative: {
        id: creative.id,
        format: creative.format,
        asset_url: creative.asset_url,
        thumb_url: creative.thumb_url ?? null,
        headline: creative.headline ?? null,
        body: creative.body ?? null,
        cta_label: creative.cta_label ?? null,
        cta_url: creative.cta_url ?? null,
        duration_sec: creative.duration_sec ?? null,
      },
    };

    return NextResponse.json(res, { status: 200 });
  }

  return NextResponse.json(
    { show: false, reason: "Aucune creation disponible." } satisfies DecideResponse,
    { status: 200 }
  );
}

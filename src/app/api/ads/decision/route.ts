import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseQuery } from "../../_utils/validate";
import { requireAdRuntimeAuth } from "../_runtime-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CampaignRow = {
  id: string;
  name: string | null;
  priority: number | null;
  status: string | null;
  active: boolean | null;
  channel_id: string | null;
  stream_id: string | null;
};

type CreativeRow = {
  id: string;
  campaign_id: string;
  media_url: string | null;
  click_url: string | null;
  weight: number | null;
  active: boolean | null;
};

function pickWeighted<T extends { weight: number }>(items: T[]) {
  const sum = items.reduce((a, b) => a + (b.weight || 1), 0);
  let r = Math.random() * (sum || 1);
  for (const it of items) {
    r -= it.weight || 1;
    if (r <= 0) return it;
  }
  return items[0];
}

function isCampaignActive(row: CampaignRow) {
  if (row.active === false) return false;
  const status = String(row.status ?? "").trim().toLowerCase();
  if (!status) return true;
  return status === "active";
}

function normalizeId(value?: string | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export async function GET(req: Request) {
  const auth = await requireAdRuntimeAuth(req, "manage_monetization");
  if (!auth.ok) return auth.res;

  const query = parseQuery(
    req,
    z.object({
      channel_id: z.string().optional(),
      stream_id: z.string().optional(),
    })
  );
  if (!query.ok) return query.res;

  const scopedStreamId = normalizeId(auth.streamId);
  const requestedStreamId = normalizeId(query.data.stream_id);
  if (scopedStreamId && requestedStreamId && requestedStreamId !== scopedStreamId) {
    return NextResponse.json({ ok: false, error: "Authentification ingest invalide." }, { status: 401 });
  }

  const stream_id = requestedStreamId ?? scopedStreamId;
  const channel_id = normalizeId(query.data.channel_id);
  const tenant_id = auth.tenantId;
  const admin = supabaseAdmin();

  let cq = admin
    .from("ad_campaigns")
    .select("id,name,priority,status,active,channel_id,stream_id")
    .eq("tenant_id", tenant_id)
    .order("priority", { ascending: false })
    .limit(50);

  if (stream_id) cq = cq.or(`stream_id.eq.${stream_id},stream_id.is.null`);
  if (!stream_id && channel_id) cq = cq.or(`channel_id.eq.${channel_id},channel_id.is.null`);

  const { data: campaigns, error: campaignsError } = await cq;
  if (campaignsError) {
    console.error("Ad decision campaigns error", { error: campaignsError.message, tenantId: tenant_id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }

  const activeCampaigns = ((campaigns ?? []) as CampaignRow[]).filter(isCampaignActive);
  if (activeCampaigns.length === 0) {
    return NextResponse.json({ ok: true, ad: null }, { status: 200 });
  }

  const topPriority = Number(activeCampaigns[0]?.priority ?? 0);
  const top = activeCampaigns.filter((campaign) => Number(campaign.priority ?? 0) === topPriority);
  const pickedCampaign = top[Math.floor(Math.random() * top.length)];

  const { data: creatives, error: creativesError } = await admin
    .from("ad_creatives")
    .select("id,campaign_id,media_url,click_url,weight,active")
    .eq("tenant_id", tenant_id)
    .eq("campaign_id", pickedCampaign.id)
    .eq("active", true)
    .limit(50);

  if (creativesError) {
    console.error("Ad decision creatives error", { error: creativesError.message, tenantId: tenant_id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }

  const activeCreatives = ((creatives ?? []) as CreativeRow[]).filter((creative) => creative.active !== false);
  if (activeCreatives.length === 0) {
    return NextResponse.json({ ok: true, ad: null }, { status: 200 });
  }

  const chosen = pickWeighted(
    activeCreatives.map((creative) => ({
      ...creative,
      weight: Number(creative.weight ?? 1),
    }))
  );

  return NextResponse.json(
    {
      ok: true,
      ad: {
        request_id: crypto.randomUUID(),
        tenant_id,
        channel_id,
        stream_id,
        campaign: { id: pickedCampaign.id, name: pickedCampaign.name ?? "Campaign" },
        creative: {
          id: chosen.id,
          media_url: chosen.media_url,
          click_url: chosen.click_url,
        },
      },
    },
    { status: 200 }
  );
}

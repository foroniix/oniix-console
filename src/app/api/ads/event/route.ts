import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdEventType = "IMPRESSION" | "CLICK" | "START" | "COMPLETE" | "SKIP";
type Placement = "PLAYER_START" | "EVERY_X_MIN" | "ON_EVENT" | "MANUAL_TRIGGER";

type Body = {
  event: AdEventType;
  placement?: Placement | null;

  campaign_id?: string | null;
  creative_id?: string | null;

  stream_id?: string | null;
  channel_id?: string | null;

  session_id?: string | null;
  device?: string | null;
  country?: string | null;
};

function ok(data: any) {
  return NextResponse.json(data, { status: 200 });
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function normStr(v: unknown, max = 500) {
  const s = String(v ?? "").trim();
  if (!s || s === "undefined" || s === "null") return null;
  return s.length > max ? s.slice(0, max) : s;
}

function normCountry(v: unknown) {
  const s = normStr(v, 3);
  return s ? s.toUpperCase() : null;
}

function isEvent(x: any): x is AdEventType {
  return ["IMPRESSION", "CLICK", "START", "COMPLETE", "SKIP"].includes(String(x));
}

function isPlacement(x: any): x is Placement {
  return ["PLAYER_START", "EVERY_X_MIN", "ON_EVENT", "MANUAL_TRIGGER"].includes(String(x));
}

async function safeGetUserId(sb: ReturnType<typeof supabaseUser>) {
  // Optional: only if you want user_id filled.
  // If it fails, we return null (tracking still works).
  try {
    const { data, error } = await sb.auth.getUser();
    if (error) return null;
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  // Auth console (session)
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const ctx = auth.ctx;

  // Must have tenant in JWT (app_metadata.tenant_id)
  const tenantRes = await requireTenant(ctx);
  if (tenantRes) return tenantRes;

  const parsed = await parseJson(
    req,
    z.object({
      event: z.string().min(1),
      placement: z.string().optional().nullable(),
      campaign_id: z.string().optional().nullable(),
      creative_id: z.string().optional().nullable(),
      stream_id: z.string().optional().nullable(),
      channel_id: z.string().optional().nullable(),
      session_id: z.string().optional().nullable(),
      device: z.string().optional().nullable(),
      country: z.string().optional().nullable(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body: Body = parsed.data;

  const event = body.event;
  if (!isEvent(event)) return bad("Donnees invalides.");

  const placement = body.placement ?? null;
  if (placement && !isPlacement(placement)) return bad("Donnees invalides.");

  // Optional IDs
  const campaign_id = normStr(body.campaign_id, 80);
  const creative_id = normStr(body.creative_id, 80);
  const stream_id = normStr(body.stream_id, 80);
  const channel_id = normStr(body.channel_id, 80);

  // Context
  const session_id = normStr(body.session_id, 200);
  const device = normStr(body.device, 32)?.toLowerCase() ?? null;
  const country = normCountry(body.country);

  // Supabase client with user token (RLS applies)
  const sb = supabaseUser(ctx.accessToken);

  const tenant_id = ctx.tenantId as string;

  const user_id = await safeGetUserId(sb);

  const { error } = await sb.from("ad_events").insert({
    tenant_id,
    campaign_id,
    creative_id,
    event,
    placement,
    stream_id,
    channel_id,
    session_id,
    device,
    country,
    user_id,
  });

  if (error) {
    console.error("Ad event insert error", { error: error.message, tenantId: tenant_id });
    return bad("Une erreur est survenue.", 400);
  }

  return ok({ ok: true });
}

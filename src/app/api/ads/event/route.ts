import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

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
  const tenantRes = requireTenant(ctx);
  if (tenantRes) return tenantRes;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return bad("Invalid JSON body");

  const event = body.event;
  if (!isEvent(event)) return bad("Invalid event");

  const placement = body.placement ?? null;
  if (placement && !isPlacement(placement)) return bad("Invalid placement");

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

  if (error) return bad(error.message, 400);

  return ok({ ok: true });
}

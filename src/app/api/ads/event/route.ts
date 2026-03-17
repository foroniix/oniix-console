import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";
import { requireAdRuntimeAuth } from "../_runtime-auth";

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

function ok(data: unknown) {
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

function isEvent(x: unknown): x is AdEventType {
  return ["IMPRESSION", "CLICK", "START", "COMPLETE", "SKIP"].includes(String(x));
}

function isPlacement(x: unknown): x is Placement {
  return ["PLAYER_START", "EVERY_X_MIN", "ON_EVENT", "MANUAL_TRIGGER"].includes(String(x));
}

export async function POST(req: Request) {
  const auth = await requireAdRuntimeAuth(req);
  if (!auth.ok) return auth.res;

  const parsed = await parseJson(
    req,
    z.object({
      event: z.enum(["IMPRESSION", "CLICK", "START", "COMPLETE", "SKIP"]),
      placement: z.enum(["PLAYER_START", "EVERY_X_MIN", "ON_EVENT", "MANUAL_TRIGGER"]).optional().nullable(),
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

  if (auth.source === "ingest" && auth.streamId) {
    const scopedStreamId = auth.streamId.trim();
    const requestedStreamId = stream_id?.trim() ?? "";
    if (!requestedStreamId || requestedStreamId !== scopedStreamId) {
      return bad("Authentification ingest invalide.", 401);
    }
  }

  const admin = supabaseAdmin();

  const { error } = await admin.from("ad_events").insert({
    tenant_id: auth.tenantId,
    campaign_id,
    creative_id,
    event,
    placement,
    stream_id,
    channel_id,
    session_id,
    device,
    country,
    user_id: auth.userId,
  });

  if (error) {
    console.error("Ad event insert error", { error: error.message, tenantId: auth.tenantId });
    return bad("Une erreur est survenue.", 400);
  }

  return ok({ ok: true });
}

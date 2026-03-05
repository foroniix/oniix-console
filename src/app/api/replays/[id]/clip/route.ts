import { NextResponse, type NextRequest } from "next/server";

import { requireAuth, requireTenant } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await params;
  const supa = supabaseUser(ctx.accessToken);

  const { data, error } = await supa
    .from("replays")
    .select("id,replay_status,generated_manifest,processing_error,updated_at")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Replay clip manifest load error", {
      error: error.message,
      code: error.code,
      tenantId: ctx.tenantId,
      replayId: id,
    });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
  }

  const manifest = typeof data.generated_manifest === "string" ? data.generated_manifest : "";
  if (!manifest) {
    return NextResponse.json(
      {
        error: "Manifest de replay indisponible.",
        replayStatus: data.replay_status ?? null,
        processingError: data.processing_error ?? null,
      },
      { status: 404 }
    );
  }

  return new NextResponse(manifest, {
    status: 200,
    headers: {
      "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
      "cache-control": "private, no-store",
      "x-replay-status": String(data.replay_status ?? ""),
    },
  });
}

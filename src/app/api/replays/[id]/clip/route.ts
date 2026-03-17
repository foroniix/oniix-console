import { NextResponse, type NextRequest } from "next/server";

import { requireTenantAccess } from "../../../tenant/_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTenantAccess("view_workspace");
  if (!ctx.ok) return ctx.res;

  const { id } = await params;

  const { data, error } = await ctx.sb
    .from("replays")
    .select("id,replay_status,generated_manifest,processing_error,updated_at")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Replay clip manifest load error", {
      error: error.message,
      code: error.code,
      tenantId: ctx.tenant_id,
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

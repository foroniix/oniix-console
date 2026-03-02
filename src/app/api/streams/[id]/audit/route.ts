import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuth, requireTenant } from "../../../../_utils/auth";
import { supabaseUser } from "../../../../_utils/supabase";
import { parseQuery } from "../../../../_utils/validate";

type Params = { params: Promise<{ id: string }> };

const QUERY_SCHEMA = z.object({
  limit: z.coerce.number().int().min(5).max(100).optional(),
});

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await params;
  const query = parseQuery(req, QUERY_SCHEMA);
  if (!query.ok) return query.res;

  const limit = query.data.limit ?? 30;
  const supa = supabaseUser(ctx.accessToken);

  const { data: stream, error: streamError } = await supa
    .from("streams")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .single();

  if (streamError || !stream) {
    if (streamError) {
      console.error("Stream audit lookup error", {
        error: streamError.message,
        tenantId: ctx.tenantId,
        id,
      });
    }
    return NextResponse.json({ ok: false, error: "Ressource introuvable." }, { status: 404 });
  }

  const { data, error } = await supa
    .from("audit_logs")
    .select("id,actor_user_id,action,target_type,target_id,metadata,created_at")
    .eq("tenant_id", ctx.tenantId)
    .eq("target_type", "stream")
    .eq("target_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Stream audit load error", { error: error.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      logs: data ?? [],
    },
    { status: 200 }
  );
}

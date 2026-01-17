import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";
import { parseJson } from "../../../_utils/validate";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await context.params;

  const parsed = await parseJson(
    req,
    z.object({
      status: z.string().min(1),
    })
  );
  if (!parsed.ok) return parsed.res;
  const { status } = parsed.data;
  const supa = supabaseUser(ctx.accessToken);

  const { data, error } = await supa
    .from("streams")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Stream status update error", { error: error.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  return NextResponse.json(data);
}

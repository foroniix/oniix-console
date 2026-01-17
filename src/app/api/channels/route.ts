import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../_utils/auth";
import { supabaseUser } from "../_utils/supabase";
import { parseJson } from "../_utils/validate";

export async function GET() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const supa = supabaseUser(ctx.accessToken);

  const { data, error } = await supa
    .from("channels")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Channels load error", { error: error.message, tenantId: ctx.tenantId });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const parsed = await parseJson(
      req,
      z.object({
        name: z.string().min(1),
        slug: z.string().optional(),
        category: z.string().optional(),
        active: z.boolean().optional(),
        logo: z.string().nullable().optional(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const body = parsed.data;
    const supa = supabaseUser(ctx.accessToken);

    const slug =
      body.slug && body.slug.trim() !== ""
        ? body.slug
        : body.name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-");

    const { data, error } = await supa
      .from("channels")
      .insert({
        tenant_id: ctx.tenantId,
        name: body.name,
        slug,
        category: body.category ?? "Other",
        active: body.active ?? true,
        logo: body.logo ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Channel create error", { error: error.message, tenantId: ctx.tenantId });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}

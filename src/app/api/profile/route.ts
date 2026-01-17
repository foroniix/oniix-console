import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../_utils/auth";
import { supabaseUser } from "../_utils/supabase";
import { parseJson } from "../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("res" in auth) return auth.res;
    const { ctx } = auth;

    const tenantErr = await requireTenant(ctx);
    if (tenantErr) return tenantErr;

    const sb = supabaseUser(ctx.accessToken);

    const { data: profile, error } = await sb
      .from("profiles")
      .select("user_id, tenant_id, full_name, avatar_url")
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (error) {
      console.error("Profile load error", { error: error.message, userId: ctx.userId });
      return NextResponse.json(
        { ok: false, error: "Impossible de charger votre profil." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        profile: profile ?? {
          user_id: ctx.userId,
          tenant_id: null,
          full_name: null,
          avatar_url: null,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("Profile GET error", { error: e?.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth();
    if ("res" in auth) return auth.res;
    const { ctx } = auth;

    const tenantErr = await requireTenant(ctx);
    if (tenantErr) return tenantErr;

    const sb = supabaseUser(ctx.accessToken);

    const parsed = await parseJson(
      req,
      z.object({
        full_name: z.string().optional(),
        avatar_url: z.string().optional(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const full_name = parsed.data.full_name?.trim() ?? null;
    const avatar_url = parsed.data.avatar_url?.trim() ?? null;

    const payload: any = {
      user_id: ctx.userId,
      tenant_id: ctx.tenantId,
      full_name: full_name && full_name.length ? full_name : null,
      avatar_url: avatar_url && avatar_url.length ? avatar_url : null,
    };

    const { data: profile, error } = await sb
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id, tenant_id, full_name, avatar_url")
      .single();

    if (error) {
      console.error("Profile update error", { error: error.message, userId: ctx.userId });
      return NextResponse.json(
        { ok: false, error: "Impossible de mettre a jour votre profil." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e: any) {
    console.error("Profile PATCH error", { error: e?.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}

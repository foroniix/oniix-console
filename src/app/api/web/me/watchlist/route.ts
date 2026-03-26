import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth } from "../../../_utils/auth";
import {
  catalogDomainUnavailableResponse,
  catalogPolicyUnavailableResponse,
  isCatalogDomainMissing,
  isCatalogPolicyMissing,
} from "../../../_utils/catalog";
import { supabaseAdmin, supabaseUser } from "../../../_utils/supabase";
import { parseJson } from "../../../_utils/validate";
import { resolveTenantForPlayable, WEB_WATCHLIST_PLAYABLE_TYPES } from "../_utils";

const requestSchema = z.object({
  playable_type: z.enum(WEB_WATCHLIST_PLAYABLE_TYPES),
  playable_id: z.string().uuid(),
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if ("res" in auth) return auth.res;
    const { ctx } = auth;

    const parsed = await parseJson(req, requestSchema);
    if (!parsed.ok) return parsed.res;

    const body = parsed.data;
    const admin = supabaseAdmin();
    const tenant = await resolveTenantForPlayable(admin, body.playable_type, body.playable_id);
    if (!tenant.ok || !tenant.tenantId) {
      const message = tenant.error ?? "Contenu introuvable.";
      if (isCatalogDomainMissing({ message })) return catalogDomainUnavailableResponse();
      return NextResponse.json({ ok: false, error: "Contenu introuvable." }, { status: 404 });
    }

    const sb = supabaseUser(ctx.accessToken);
    const { error } = await sb.from("watchlist_items").upsert(
      {
        tenant_id: tenant.tenantId,
        user_id: ctx.userId,
        playable_type: body.playable_type,
        playable_id: body.playable_id,
        created_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,user_id,playable_type,playable_id" }
    );

    if (error) {
      if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
      if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();

      console.error("Web watchlist add error", {
        error: error.message,
        userId: ctx.userId,
        playableType: body.playable_type,
        playableId: body.playable_id,
      });
      return NextResponse.json(
        { ok: false, error: "Impossible d'ajouter ce contenu a votre liste." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Web watchlist add route error", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth();
    if ("res" in auth) return auth.res;
    const { ctx } = auth;

    const parsed = await parseJson(req, requestSchema);
    if (!parsed.ok) return parsed.res;

    const body = parsed.data;
    const admin = supabaseAdmin();
    const tenant = await resolveTenantForPlayable(admin, body.playable_type, body.playable_id);
    if (!tenant.ok || !tenant.tenantId) {
      const message = tenant.error ?? "Contenu introuvable.";
      if (isCatalogDomainMissing({ message })) return catalogDomainUnavailableResponse();
      return NextResponse.json({ ok: false, error: "Contenu introuvable." }, { status: 404 });
    }

    const sb = supabaseUser(ctx.accessToken);
    const { error } = await sb
      .from("watchlist_items")
      .delete()
      .eq("tenant_id", tenant.tenantId)
      .eq("user_id", ctx.userId)
      .eq("playable_type", body.playable_type)
      .eq("playable_id", body.playable_id);

    if (error) {
      if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
      if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();

      console.error("Web watchlist remove error", {
        error: error.message,
        userId: ctx.userId,
        playableType: body.playable_type,
        playableId: body.playable_id,
      });
      return NextResponse.json(
        { ok: false, error: "Impossible de retirer ce contenu de votre liste." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Web watchlist remove route error", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAnon, supabaseAdmin } from "../../_utils/supabase";
import { setAuthCookies } from "../../_utils/cookies";
import { parseJson } from "../../_utils/validate";
import { enforceRateLimit, getRateLimitConfig } from "../../_utils/rate-limit";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function tableExists(admin: ReturnType<typeof supabaseAdmin>, tableName: string) {
  const { error } = await admin.from(tableName).select("*").limit(1);
  return !error;
}

export async function POST(req: Request) {
  try {
    const parsed = await parseJson(
      req,
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        tenantName: z.string().max(120).optional(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const { email, password, tenantName } = parsed.data;

    if (!email || !password) return jsonError("Email et mot de passe requis.", 400);
    if (typeof password !== "string" || password.length < 8) {
      return jsonError("Mot de passe trop court (min 8 caracteres).", 400);
    }

    const rateLimit = getRateLimitConfig("AUTH", { limit: 10, windowMs: 60_000 });
    const rateRes = await enforceRateLimit(req, rateLimit);
    if (rateRes) return rateRes;

    const sbAnon = supabaseAnon();
    const sbAdmin = supabaseAdmin();

    const { data: signUpData, error: signUpErr } = await sbAnon.auth.signUp({
      email,
      password,
    });
    if (signUpErr) {
      console.error("Signup error", { error: signUpErr.message });
      return jsonError("Impossible de creer le compte.", 401);
    }

    const user = signUpData.user;
    if (!user) {
      return NextResponse.json(
        { ok: true, message: "Compte cree. Verifiez votre email pour confirmer." },
        { status: 200 }
      );
    }

    let createdTenantId: string | null = null;

    const hasTenants = await tableExists(sbAdmin, "tenants");
    const hasMemberships = await tableExists(sbAdmin, "tenant_memberships");

    if (hasTenants) {
      const { data: tenantRow, error: tenantErr } = await sbAdmin
        .from("tenants")
        .insert({
          name:
            typeof tenantName === "string" && tenantName.trim().length > 0
              ? tenantName.trim()
              : "Mon espace",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (!tenantErr && tenantRow?.id) {
        createdTenantId = tenantRow.id;

        if (hasMemberships) {
          await sbAdmin.from("tenant_memberships").insert({
            tenant_id: createdTenantId,
            user_id: user.id,
            role: "owner",
          });
        }

        await sbAdmin.auth.admin.updateUserById(user.id, {
          app_metadata: {
            tenant_id: createdTenantId,
            role: "tenant_admin",
          },
        });
      }
    }

    const { data: signInData, error: signInErr } = await sbAnon.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      console.error("Signin after signup error", { error: signInErr.message });
      return jsonError("Impossible d'ouvrir la session.", 401);
    }

    const access = signInData.session?.access_token;
    const refresh = signInData.session?.refresh_token;
    if (!access || !refresh) return jsonError("Session introuvable.", 500);

    const res = NextResponse.json({ ok: true, tenant_id: createdTenantId }, { status: 200 });
    setAuthCookies(res, access, refresh);
    return res;
  } catch (e: any) {
    console.error("Signup error", { error: e?.message });
    return jsonError("Une erreur est survenue.", 500);
  }
}

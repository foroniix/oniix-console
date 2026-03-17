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
        password: z
          .string()
          .min(12)
          .regex(/[a-z]/, "missing_lowercase")
          .regex(/[A-Z]/, "missing_uppercase")
          .regex(/\d/, "missing_number")
          .regex(/[^A-Za-z0-9]/, "missing_symbol"),
        tenantName: z.string().trim().min(2).max(120),
        fullName: z.string().trim().min(2).max(120).optional(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const { email, password, tenantName, fullName } = parsed.data;

    if (!email || !password || !tenantName) return jsonError("Email, mot de passe et organisation requis.", 400);
    if (typeof password !== "string" || password.length < 12) {
      return jsonError("Mot de passe trop faible (12 caractères minimum).", 400);
    }

    const rateLimit = getRateLimitConfig("AUTH", { limit: 10, windowMs: 60_000 });
    const rateRes = await enforceRateLimit(req, rateLimit);
    if (rateRes) return rateRes;

    const sbAnon = supabaseAnon();
    const sbAdmin = supabaseAdmin();

    const { data: signUpData, error: signUpErr } = await sbAnon.auth.signUp({
      email,
      password,
      options: fullName
        ? {
            data: {
              display_name: fullName.trim(),
            },
          }
        : undefined,
    });
    if (signUpErr) {
      console.error("Signup error", { error: signUpErr.message });
      return jsonError("Impossible de créer le compte.", 401);
    }

    const user = signUpData.user;
    if (!user) {
      return NextResponse.json(
        {
          ok: true,
          requires_email_confirmation: true,
          message: "Compte créé. Vérifiez votre email pour confirmer votre adresse.",
        },
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
          name: tenantName.trim(),
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
      return NextResponse.json(
        {
          ok: true,
          requires_email_confirmation: true,
          message: "Compte créé. Vérifiez votre email pour confirmer votre adresse, puis connectez-vous.",
        },
        { status: 200 }
      );
    }

    const access = signInData.session?.access_token;
    const refresh = signInData.session?.refresh_token;
    if (!access || !refresh) return jsonError("Session introuvable.", 500);

    const res = NextResponse.json({ ok: true, tenant_id: createdTenantId }, { status: 200 });
    setAuthCookies(res, access, refresh);
    return res;
  } catch (error: unknown) {
    console.error("Signup error", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return jsonError("Une erreur est survenue.", 500);
  }
}

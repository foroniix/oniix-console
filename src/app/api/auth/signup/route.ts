import { NextResponse } from "next/server";
import { z } from "zod";

import { setAuthCookies } from "../../_utils/cookies";
import { enforceRateLimit, getRateLimitConfig } from "../../_utils/rate-limit";
import { supabaseAdmin, supabaseAnon } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";
import {
  ORGANIZATION_TYPE_VALUES,
  PRIMARY_USE_CASE_VALUES,
  TEAM_SIZE_VALUES,
  isPersonalEmailDomain,
} from "@/lib/tenant-onboarding";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function tableExists(admin: ReturnType<typeof supabaseAdmin>, tableName: string) {
  const { error } = await admin.from(tableName).select("*").limit(1);
  return !error;
}

async function rollbackProvisioning(
  admin: ReturnType<typeof supabaseAdmin>,
  userId: string,
  tenantId?: string | null
) {
  const operations: Promise<unknown>[] = [];

  if (tenantId) {
    operations.push(
      (async () => {
        await admin.from("tenants").delete().eq("id", tenantId);
      })()
    );
  }

  operations.push(admin.auth.admin.deleteUser(userId));
  await Promise.allSettled(operations);
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
        fullName: z.string().trim().min(2).max(120),
        jobTitle: z.string().trim().min(2).max(120),
        country: z.string().trim().min(2).max(80),
        organizationType: z.enum(ORGANIZATION_TYPE_VALUES),
        teamSize: z.enum(TEAM_SIZE_VALUES),
        primaryUseCase: z.enum(PRIMARY_USE_CASE_VALUES),
        launchNotes: z.string().trim().max(500).optional(),
        acceptedTerms: z.literal(true),
      })
    );
    if (!parsed.ok) return parsed.res;

    const {
      acceptedTerms,
      country,
      email,
      fullName,
      jobTitle,
      launchNotes,
      organizationType,
      password,
      primaryUseCase,
      teamSize,
      tenantName,
    } = parsed.data;

    if (!email || !password || !tenantName) {
      return jsonError("Email, mot de passe et organisation requis.", 400);
    }
    if (typeof password !== "string" || password.length < 12) {
      return jsonError("Mot de passe trop faible (12 caracteres minimum).", 400);
    }
    if (!acceptedTerms) {
      return jsonError("Vous devez accepter les conditions pour creer un espace.", 400);
    }

    const rateLimit = getRateLimitConfig("AUTH", { limit: 10, windowMs: 60_000 });
    const rateRes = await enforceRateLimit(req, rateLimit);
    if (rateRes) return rateRes;

    const sbAnon = supabaseAnon();
    const sbAdmin = supabaseAdmin();
    const normalizedLaunchNotes = launchNotes?.trim() || null;
    const isProfessionalEmail = !isPersonalEmailDomain(email);
    const baseUserMetadata = {
      display_name: fullName.trim(),
      full_name: fullName.trim(),
      job_title: jobTitle.trim(),
      organization_name: tenantName.trim(),
      organization_type: organizationType,
      country: country.trim(),
      team_size: teamSize,
      primary_use_case: primaryUseCase,
      launch_notes: normalizedLaunchNotes,
      email_domain_type: isProfessionalEmail ? "professional" : "personal",
      signup_surface: "console",
      onboarding_version: 2,
    };

    const { data: signUpData, error: signUpErr } = await sbAnon.auth.signUp({
      email,
      password,
      options: {
        data: baseUserMetadata,
      },
    });
    if (signUpErr) {
      console.error("Signup error", { error: signUpErr.message });
      return jsonError("Impossible de creer le compte.", 401);
    }

    const user = signUpData.user;
    if (!user) {
      return NextResponse.json(
        {
          ok: true,
          requires_email_confirmation: true,
          message: "Compte cree. Verifiez votre email pour confirmer votre adresse.",
        },
        { status: 200 }
      );
    }

    const hasTenants = await tableExists(sbAdmin, "tenants");
    const hasMemberships = await tableExists(sbAdmin, "tenant_memberships");
    const hasProfiles = await tableExists(sbAdmin, "profiles");

    if (!hasTenants || !hasMemberships) {
      await rollbackProvisioning(sbAdmin, user.id);
      return jsonError("La creation d'organisation est indisponible pour le moment. Contactez le support Oniix.", 503);
    }

    const { data: tenantRow, error: tenantErr } = await sbAdmin
      .from("tenants")
      .insert({
        name: tenantName.trim(),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (tenantErr || !tenantRow?.id) {
      console.error("Tenant provisioning error", {
        error: tenantErr?.message ?? "tenant_insert_failed",
        userId: user.id,
      });
      await rollbackProvisioning(sbAdmin, user.id);
      return jsonError("Impossible de creer l'organisation.", 500);
    }

    const createdTenantId = tenantRow.id;

    const { error: membershipError } = await sbAdmin.from("tenant_memberships").insert({
      tenant_id: createdTenantId,
      user_id: user.id,
      role: "owner",
    });

    if (membershipError) {
      console.error("Tenant owner membership error", {
        error: membershipError.message,
        userId: user.id,
        tenantId: createdTenantId,
      });
      await rollbackProvisioning(sbAdmin, user.id, createdTenantId);
      return jsonError("Impossible de finaliser le compte administrateur principal.", 500);
    }

    if (hasProfiles) {
      const { error: profileError } = await sbAdmin.from("profiles").upsert(
        {
          user_id: user.id,
          tenant_id: createdTenantId,
          full_name: fullName.trim(),
          avatar_url: null,
        },
        { onConflict: "user_id" }
      );

      if (profileError) {
        console.error("Tenant signup profile sync error", {
          error: profileError.message,
          userId: user.id,
          tenantId: createdTenantId,
        });
      }
    }

    const { error: metadataError } = await sbAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        tenant_id: createdTenantId,
        role: "tenant_admin",
      },
      user_metadata: {
        ...((user.user_metadata ?? {}) as Record<string, unknown>),
        ...baseUserMetadata,
        tenant_id: createdTenantId,
      },
    });

    if (metadataError) {
      console.error("Tenant signup metadata sync error", {
        error: metadataError.message,
        userId: user.id,
        tenantId: createdTenantId,
      });
      await rollbackProvisioning(sbAdmin, user.id, createdTenantId);
      return jsonError("Impossible de finaliser l'acces a l'espace administrateur.", 500);
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
          message:
            "Espace cree. Verifiez votre email pour confirmer votre adresse, puis connectez-vous a la console.",
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

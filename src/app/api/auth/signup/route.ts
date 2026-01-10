import { NextResponse } from "next/server";
import { supabaseAnon, supabaseAdmin } from "../../_utils/supabase";
import { setAuthCookies } from "../../_utils/cookies";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function tableExists(admin: ReturnType<typeof supabaseAdmin>, tableName: string) {
  // test simple : une requête SELECT 0 ligne, si ça fail -> table absente ou pas d’accès
  const { error } = await admin.from(tableName).select("*").limit(1);
  return !error;
}

export async function POST(req: Request) {
  try {
    const { email, password, tenantName } = await req.json();

    if (!email || !password) return jsonError("Email et mot de passe requis", 400);
    if (typeof password !== "string" || password.length < 8) {
      return jsonError("Mot de passe trop court (min 8 caractères)", 400);
    }

    const sbAnon = supabaseAnon();
    const sbAdmin = supabaseAdmin();

    // 1) signup
    const { data: signUpData, error: signUpErr } = await sbAnon.auth.signUp({
      email,
      password,
    });
    if (signUpErr) return jsonError(signUpErr.message, 401);

    // Si confirmation email ON : user peut être null
    const user = signUpData.user;
    if (!user) {
      return NextResponse.json(
        { ok: true, message: "Compte créé. Vérifie ton email pour confirmer." },
        { status: 200 }
      );
    }

    // 2) Tentative de création tenant + membership (si tables existent)
    let createdTenantId: string | null = null;

    const hasTenants = await tableExists(sbAdmin, "tenants");
    const hasMemberships = await tableExists(sbAdmin, "tenant_memberships");

    if (hasTenants) {
      const { data: tenantRow, error: tenantErr } = await sbAdmin
        .from("tenants")
        .insert({
          name: typeof tenantName === "string" && tenantName.trim().length > 0 ? tenantName.trim() : "Mon tenant",
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

        // 3) Stocker tenant_id en app_metadata (pratique côté app)
        await sbAdmin.auth.admin.updateUserById(user.id, {
          app_metadata: {
            tenant_id: createdTenantId,
            role: "tenant_admin",
          },
        });
      }
    }

    // 4) auto-login
    const { data: signInData, error: signInErr } = await sbAnon.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) return jsonError(signInErr.message, 401);

    const access = signInData.session?.access_token;
    const refresh = signInData.session?.refresh_token;
    if (!access || !refresh) return jsonError("Session introuvable", 500);

    const res = NextResponse.json(
      { ok: true, tenant_id: createdTenantId },
      { status: 200 }
    );
    setAuthCookies(res, access, refresh);
    return res;
  } catch (e: any) {
    return jsonError(e?.message || "Erreur serveur", 500);
  }
}

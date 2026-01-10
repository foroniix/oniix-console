import { NextResponse } from "next/server";
import { supabaseAdmin } from "../_utils/supabase";
import { requireAuth, requireRole } from "../_utils/auth";

// --- GET: Lister les utilisateurs (superadmin only) ---
export async function GET() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const roleErr = requireRole(ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  const supa = supabaseAdmin();

  const { data, error } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || u.user_metadata?.full_name || null,
    phone: u.phone || u.user_metadata?.phone || null,
    createdAt: u.created_at,
    role: u.app_metadata?.role || "viewer",
    tenantId: u.app_metadata?.tenant_id ?? u.user_metadata?.tenant_id ?? null,
    suspended: !!u.app_metadata?.suspended,
  }));

  users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(users);
}

// --- POST: Créer (Inviter) ou Modifier (superadmin only) ---
export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const roleErr = requireRole(ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  try {
    const body = await req.json();
    const supa = supabaseAdmin();

    if (body.id) {
      const appMetadataUpdates: any = {};
      const userMetadataUpdates: any = {};

      if (body.role) appMetadataUpdates.role = body.role;
      if (typeof body.suspended === "boolean") appMetadataUpdates.suspended = body.suspended;
      if (body.tenantId) appMetadataUpdates.tenant_id = body.tenantId;

      if (body.name !== undefined) userMetadataUpdates.name = body.name;
      if (body.phone !== undefined) userMetadataUpdates.phone = body.phone;
      if (body.tenantId) userMetadataUpdates.tenant_id = body.tenantId;

      const { data, error } = await supa.auth.admin.updateUserById(body.id, {
        app_metadata: appMetadataUpdates,
        user_metadata: userMetadataUpdates,
      });

      if (error) throw error;
      return NextResponse.json({ id: data.user.id, status: "updated" });
    } else {
      if (!body.email) return NextResponse.json({ error: "Email required" }, { status: 400 });

      const { data, error } = await supa.auth.admin.inviteUserByEmail(body.email, {
        data: { name: body.name || "", role: body.role || "viewer", tenant_id: body.tenantId || null },
        redirectTo: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      });

      if (error) throw error;

      if (data.user) {
        await supa.auth.admin.updateUserById(data.user.id, {
          app_metadata: {
            role: body.role || "viewer",
            suspended: !!body.suspended,
            tenant_id: body.tenantId || null,
          },
        });
      }

      return NextResponse.json({ id: data.user?.id, status: "invited" }, { status: 201 });
    }
  } catch (err: any) {
    console.error("User API Error:", err);
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 });
  }
}

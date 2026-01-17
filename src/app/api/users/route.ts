import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../_utils/supabase";
import { requireAuth, requireRole } from "../_utils/auth";
import { parseJson } from "../_utils/validate";
import { enforceRateLimit, getRateLimitConfig } from "../_utils/rate-limit";

// --- GET: Lister les utilisateurs (superadmin only) ---
export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const roleErr = requireRole(ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  const rateLimit = getRateLimitConfig("ADMIN", { limit: 20, windowMs: 60_000 });
  const rateRes = await enforceRateLimit(req, rateLimit, ctx.userId);
  if (rateRes) return rateRes;

  const supa = supabaseAdmin();

  const { data, error } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error("User list error", { error: error.message });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || u.user_metadata?.full_name || null,
    phone: u.phone || u.user_metadata?.phone || null,
    createdAt: u.created_at,
    role: u.app_metadata?.role || "viewer",
    tenantId: u.app_metadata?.tenant_id ?? null,
    suspended: !!u.app_metadata?.suspended,
  }));

  users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(users);
}

// --- POST: Creer (Inviter) ou Modifier (superadmin only) ---
export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const roleErr = requireRole(ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  try {
    const rateLimit = getRateLimitConfig("ADMIN", { limit: 20, windowMs: 60_000 });
    const rateRes = await enforceRateLimit(req, rateLimit, ctx.userId);
    if (rateRes) return rateRes;

    const parsed = await parseJson(
      req,
      z.object({
        id: z.string().optional(),
        email: z.string().email().optional(),
        role: z.string().optional(),
        suspended: z.boolean().optional(),
        name: z.string().optional(),
        phone: z.string().optional(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const body = parsed.data;
    const supa = supabaseAdmin();

    if (body.id) {
      const appMetadataUpdates: any = {};
      const userMetadataUpdates: any = {};

      if (body.role) appMetadataUpdates.role = body.role;
      if (typeof body.suspended === "boolean") appMetadataUpdates.suspended = body.suspended;

      if (body.name !== undefined) userMetadataUpdates.name = body.name;
      if (body.phone !== undefined) userMetadataUpdates.phone = body.phone;

      const { data, error } = await supa.auth.admin.updateUserById(body.id, {
        app_metadata: appMetadataUpdates,
        user_metadata: userMetadataUpdates,
      });

      if (error) throw error;
      return NextResponse.json({ id: data.user.id, status: "updated" });
    } else {
      if (!body.email) return NextResponse.json({ error: "Email requis." }, { status: 400 });

      const { data, error } = await supa.auth.admin.inviteUserByEmail(body.email, {
        data: { name: body.name || "", role: body.role || "viewer" },
        redirectTo: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      });

      if (error) throw error;

      if (data.user) {
        await supa.auth.admin.updateUserById(data.user.id, {
          app_metadata: {
            role: body.role || "viewer",
            suspended: !!body.suspended,
          },
        });
      }

      return NextResponse.json({ id: data.user?.id, status: "invited" }, { status: 201 });
    }
  } catch (err: any) {
    console.error("User API Error:", err);
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}

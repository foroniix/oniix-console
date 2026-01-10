import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../_utils/supabase";
import { requireAuth, requireRole } from "../../../_utils/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  const roleErr = requireRole(ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const redirectTo =
      body?.redirectTo ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/`;

    const supa = supabaseAdmin();

    // 1) retrouver l'email
    const { data: u, error: uErr } = await supa.auth.admin.getUserById(id);
    if (uErr) throw uErr;
    const email = u?.user?.email;
    if (!email) return NextResponse.json({ ok: false, error: "User has no email" }, { status: 400 });

    // 2) générer un lien
    const { data, error } = await supa.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (error) throw error;

    // Selon versions: data.properties.action_link
    const link = (data as any)?.properties?.action_link || (data as any)?.action_link;
    if (!link) return NextResponse.json({ ok: false, error: "No link returned" }, { status: 500 });

    return NextResponse.json({ ok: true, link });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Internal Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseUser } from "../../_utils/supabase";

const ACCESS_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE_NAME)?.value || null;
}

export async function GET() {
  const token = await getAuthToken();
  if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const sb = supabaseUser(token);
  const { data: u } = await sb.auth.getUser();
  const user = u?.user;
  if (!user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

  const tenant_id =
    (user.app_metadata as any)?.tenant_id ??
    (user.user_metadata as any)?.tenant_id ??
    null;

  if (!tenant_id) {
    return NextResponse.json({ ok: false, error: "No tenant_id on user" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("tenants")
    .select("id,name,created_at,created_by")
    .eq("id", tenant_id)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, tenant: data }, { status: 200 });
}

export async function PATCH(req: Request) {
  const token = await getAuthToken();
  if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const sb = supabaseUser(token);
  const { data: u } = await sb.auth.getUser();
  const user = u?.user;
  if (!user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

  const tenant_id =
    (user.app_metadata as any)?.tenant_id ??
    (user.user_metadata as any)?.tenant_id ??
    null;

  if (!tenant_id) {
    return NextResponse.json({ ok: false, error: "No tenant_id on user" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Nom invalide (min 2 caractères)" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("tenants")
    .update({ name })
    .eq("id", tenant_id)
    .select("id,name,created_at,created_by")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, tenant: data }, { status: 200 });
}

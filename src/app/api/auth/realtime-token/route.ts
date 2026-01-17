import { NextResponse } from "next/server";
import { requireAuth } from "../../_utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  // Le client en a besoin uniquement pour Realtime auth
  return NextResponse.json({ ok: true, access_token: auth.ctx.accessToken }, { status: 200 });
}

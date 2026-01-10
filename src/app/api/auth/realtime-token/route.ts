import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  // Le client en a besoin uniquement pour Realtime auth
  return NextResponse.json({ ok: true, access_token: token }, { status: 200 });
}

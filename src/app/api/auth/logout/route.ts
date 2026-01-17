import { NextResponse } from "next/server";
import { requireAuth } from "../../_utils/auth";
import { clearAuthCookies } from "../../_utils/cookies";

export async function POST() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const res = NextResponse.json({ ok: true }, { status: 200 });
  clearAuthCookies(res);
  return res;
}

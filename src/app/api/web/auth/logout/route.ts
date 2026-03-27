import { NextResponse } from "next/server";

import { clearAuthCookies } from "@/app/api/_utils/cookies";

export async function POST() {
  const res = NextResponse.json({ ok: true }, { status: 200 });
  clearAuthCookies(res);
  return res;
}

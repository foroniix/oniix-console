import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../_utils/auth";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: ctx.userId,
        email: ctx.user.email ?? null,
        tenant_id: ctx.tenantId,
        role: ctx.role,
      },
    },
    { status: 200 }
  );
}

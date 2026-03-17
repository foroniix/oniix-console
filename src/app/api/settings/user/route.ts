import { NextResponse } from "next/server";
import { getTenantContext, getTenantMembership } from "../../tenant/_utils";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const membership = await getTenantMembership(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!membership.ok) {
    return NextResponse.json({ ok: false, error: membership.error }, { status: 403 });
  }

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: ctx.user.id,
        email: ctx.user.email ?? null,
        tenant_id: ctx.tenant_id,
        role: membership.role,
      },
    },
    { status: 200 }
  );
}

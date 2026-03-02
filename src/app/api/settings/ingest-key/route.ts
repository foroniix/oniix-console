import { NextResponse } from "next/server";
import { z } from "zod";
import { generateIngestKey, hashIngestKey, resolveExpectedIngestKey } from "../../_utils/analytics-ingest";
import { parseJson } from "../../_utils/validate";
import { getTenantContext, jsonError, requireTenantAdmin } from "../../tenant/_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isMissingTableError(code?: string | null) {
  return code === "42P01" || code === "PGRST205";
}

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const adminCheck = await requireTenantAdmin(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!adminCheck.ok) return jsonError(adminCheck.error, 403);

  const { data, error } = await ctx.sb
    .from("tenant_ingest_keys")
    .select("created_at, rotated_at")
    .eq("tenant_id", ctx.tenant_id)
    .maybeSingle();

  if (error) {
    if (!isMissingTableError(error.code)) {
      console.error("Ingest key load error", {
        error: error.message,
        code: error.code,
        tenantId: ctx.tenant_id,
      });
      return jsonError("Une erreur est survenue.", 500);
    }

    const envConfigured = Boolean(resolveExpectedIngestKey(ctx.tenant_id));
    return NextResponse.json(
      {
        ok: true,
        ingest: {
          configured: envConfigured,
          source: envConfigured ? "env" : "none",
          canRotate: false,
          requiresMigration: true,
        },
      },
      { status: 200 }
    );
  }

  if (data) {
    return NextResponse.json(
      {
        ok: true,
        ingest: {
          configured: true,
          source: "db",
          canRotate: true,
          requiresMigration: false,
          created_at: data.created_at,
          rotated_at: data.rotated_at,
        },
      },
      { status: 200 }
    );
  }

  const envConfigured = Boolean(resolveExpectedIngestKey(ctx.tenant_id));
  return NextResponse.json(
    {
      ok: true,
      ingest: {
        configured: envConfigured,
        source: envConfigured ? "env" : "none",
        canRotate: true,
        requiresMigration: false,
      },
    },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const adminCheck = await requireTenantAdmin(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!adminCheck.ok) return jsonError(adminCheck.error, 403);

  const parsed = await parseJson(
    req,
    z.object({
      reason: z.string().max(160).optional(),
    })
  );
  if (!parsed.ok) return parsed.res;

  const newKey = generateIngestKey();
  const keyHash = hashIngestKey(newKey);
  const now = new Date().toISOString();

  const { error } = await ctx.sb.from("tenant_ingest_keys").upsert(
    {
      tenant_id: ctx.tenant_id,
      key_hash: keyHash,
      rotated_at: now,
      rotated_by: ctx.user.id,
    },
    { onConflict: "tenant_id" }
  );

  if (error) {
    if (isMissingTableError(error.code)) {
      return jsonError("Migration manquante: table tenant_ingest_keys indisponible.", 503);
    }
    console.error("Ingest key rotate error", {
      error: error.message,
      code: error.code,
      tenantId: ctx.tenant_id,
      userId: ctx.user.id,
    });
    return jsonError("Une erreur est survenue.", 500);
  }

  return NextResponse.json(
    {
      ok: true,
      key: newKey,
      ingest: {
        configured: true,
        source: "db",
        canRotate: true,
        requiresMigration: false,
        rotated_at: now,
      },
    },
    { status: 200 }
  );
}


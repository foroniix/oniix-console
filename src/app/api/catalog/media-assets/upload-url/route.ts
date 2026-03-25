import { NextResponse } from "next/server";
import { z } from "zod";

import { getTenantContext, jsonError, requireTenantCapability } from "../../../tenant/_utils";
import { parseJson } from "../../../_utils/validate";
import { CATALOG_MEDIA_UPLOAD_BUCKET } from "@/lib/catalog";

const uploadRequestSchema = z.object({
  owner_type: z.enum(["title", "season", "episode"]),
  owner_id: z.string().uuid(),
  file_name: z.string().trim().min(1).max(255),
  content_type: z.string().trim().max(255).nullable().optional(),
});

function sanitizeFileName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "catalog-media.bin";
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(
    ctx.sb,
    ctx.tenant_id,
    ctx.user_id,
    "edit_catalog"
  );
  if (!permission.ok) return jsonError(permission.error, 403);

  const parsed = await parseJson(req, uploadRequestSchema);
  if (!parsed.ok) return parsed.res;

  const safeName = sanitizeFileName(parsed.data.file_name);
  const objectPath = [
    ctx.tenant_id,
    parsed.data.owner_type,
    parsed.data.owner_id,
    `${Date.now()}-${safeName}`,
  ].join("/");

  const { data, error } = await ctx.admin.storage
    .from(CATALOG_MEDIA_UPLOAD_BUCKET)
    .createSignedUploadUrl(objectPath, {
      upsert: false,
    });

  if (error) {
    const message = String(error.message ?? "");
    if (/bucket/i.test(message) && /not found|does not exist/i.test(message)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bucket de visuels catalogue indisponible. Exécutez la migration Storage des visuels avant l'upload.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    upload: {
      bucket: CATALOG_MEDIA_UPLOAD_BUCKET,
      path: objectPath,
      token: data.token,
      content_type: parsed.data.content_type ?? null,
      origin_url: `storage://${CATALOG_MEDIA_UPLOAD_BUCKET}/${objectPath}`,
    },
  });
}

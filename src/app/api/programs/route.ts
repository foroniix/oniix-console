import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auditLog } from "../_utils/audit";
import { getTenantContext, jsonError, requireTenantCapability } from "../tenant/_utils";
import { parseJson, parseQuery } from "../_utils/validate";

const ProgramStatus = z.enum(["draft", "scheduled", "published", "cancelled"]);

function toIsoDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function invalidDateResponse() {
  return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const query = parseQuery(
    req,
    z.object({
      status: ProgramStatus.optional(),
      channelId: z.string().optional(),
      search: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
    })
  );
  if (!query.ok) return query.res;

  const fromIso = toIsoDate(query.data.from);
  const toIso = toIsoDate(query.data.to);

  if (query.data.from && !fromIso) return invalidDateResponse();
  if (query.data.to && !toIso) return invalidDateResponse();

  let q = ctx.sb
    .from("programs")
    .select("*, channel:channels(id,name,logo,category)")
    .eq("tenant_id", ctx.tenant_id)
    .order("created_at", { ascending: false });

  if (query.data.status) q = q.eq("status", query.data.status);
  if (query.data.channelId) q = q.eq("channel_id", query.data.channelId);
  if (query.data.search) q = q.ilike("title", `%${query.data.search}%`);
  if (fromIso) q = q.gte("created_at", fromIso);
  if (toIso) q = q.lte("created_at", toIso);
  if (query.data.limit) q = q.limit(query.data.limit);

  const { data, error } = await q;
  if (error) {
    console.error("Programs load error", { error: error.message, tenantId: ctx.tenant_id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "edit_catalog");
  if (!permission.ok) return jsonError(permission.error, 403);

  const parsed = await parseJson(
    req,
    z.object({
      title: z.string().min(1),
      channelId: z.string().nullable().optional(),
      synopsis: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      poster: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      status: ProgramStatus.optional(),
      publishedAt: z.string().nullable().optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const publishedAtIso =
    body.publishedAt === undefined
      ? null
      : body.publishedAt === null
        ? null
        : toIsoDate(body.publishedAt);

  if (body.publishedAt !== undefined && body.publishedAt !== null && !publishedAtIso) {
    return invalidDateResponse();
  }

  const now = new Date().toISOString();
  const status = body.status ?? "draft";
  const effectivePublishedAt = status === "published" ? (publishedAtIso ?? now) : publishedAtIso;

  const { data, error } = await ctx.sb
    .from("programs")
    .insert({
      tenant_id: ctx.tenant_id,
      channel_id: body.channelId ?? null,
      title: body.title.trim(),
      synopsis: body.synopsis ?? null,
      category: body.category ?? null,
      poster: body.poster ?? null,
      tags: body.tags ?? [],
      status,
      published_at: effectivePublishedAt,
      created_by: ctx.user_id,
      updated_by: ctx.user_id,
      updated_at: now,
    })
    .select("*, channel:channels(id,name,logo,category)")
    .single();

  if (error) {
    console.error("Program create error", { error: error.message, tenantId: ctx.tenant_id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    action: "program.create",
    targetType: "program",
    targetId: data.id,
    metadata: {
      title: data.title,
      status: data.status,
      channelId: data.channel_id ?? null,
    },
  });

  return NextResponse.json(data, { status: 201 });
}

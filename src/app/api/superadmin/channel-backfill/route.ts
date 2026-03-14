import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth, requireRole } from "../../_utils/auth";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const updateSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().nullable().optional(),
  originHlsUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const roleErr = requireRole(auth.ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  const admin = supabaseAdmin();

  const [{ data: tenants, error: tenantsError }, { data: channels, error: channelsError }] = await Promise.all([
    admin.from("tenants").select("id,name").order("name", { ascending: true }).limit(500),
    admin
      .from("channels")
      .select("id,name,slug,tenant_id,origin_hls_url,is_active,active,updated_at,tenant:tenants(id,name)")
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);

  if (tenantsError || channelsError) {
    console.error("Superadmin channel backfill load error", {
      tenantsError: tenantsError?.message,
      channelsError: channelsError?.message,
    });
    return NextResponse.json({ ok: false, error: "Impossible de charger les chaines a corriger." }, { status: 500 });
  }

  const rows = (channels ?? []).map((row) => {
    const tenant = row.tenant as { id?: string | null; name?: string | null } | null;
    const isActive = Boolean((row as Record<string, unknown>).is_active ?? (row as Record<string, unknown>).active);
    const originHlsUrl = String((row as Record<string, unknown>).origin_hls_url ?? "").trim();
    return {
      id: String(row.id),
      name: String(row.name ?? ""),
      slug: String(row.slug ?? ""),
      tenant_id: row.tenant_id ? String(row.tenant_id) : null,
      tenant_name: tenant?.name ? String(tenant.name) : null,
      origin_hls_url: originHlsUrl || null,
      is_active: isActive,
      updated_at: row.updated_at ? String(row.updated_at) : null,
      issues: {
        missingTenant: !row.tenant_id,
        missingOrigin: !originHlsUrl,
      },
    };
  });

  const stats = rows.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.issues.missingTenant) acc.missingTenant += 1;
      if (row.issues.missingOrigin) acc.missingOrigin += 1;
      if (row.issues.missingTenant || row.issues.missingOrigin) acc.incomplete += 1;
      return acc;
    },
    { total: 0, incomplete: 0, missingTenant: 0, missingOrigin: 0 }
  );

  return NextResponse.json({
    ok: true,
    tenants: (tenants ?? []).map((row) => ({ id: String(row.id), name: String(row.name ?? "") })),
    channels: rows,
    stats,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const roleErr = requireRole(auth.ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  const parsed = await parseJson(req, updateSchema);
  if (!parsed.ok) return parsed.res;

  const body = parsed.data;
  const admin = supabaseAdmin();
  const updateData: Record<string, unknown> = {};

  if (body.tenantId !== undefined) {
    updateData.tenant_id = body.tenantId;
  }
  if (body.originHlsUrl !== undefined) {
    updateData.origin_hls_url =
      body.originHlsUrl === null || body.originHlsUrl === "" ? null : body.originHlsUrl;
  }
  if (body.active !== undefined) {
    updateData.active = body.active;
    updateData.is_active = body.active;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ ok: false, error: "Aucune modification a appliquer." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("channels")
    .update(updateData)
    .eq("id", body.id)
    .select("id,name,slug,tenant_id,origin_hls_url,is_active,active,updated_at,tenant:tenants(id,name)")
    .single();

  if (error || !data) {
    console.error("Superadmin channel backfill update error", {
      channelId: body.id,
      error: error?.message,
    });
    return NextResponse.json({ ok: false, error: "Impossible de mettre a jour la chaine." }, { status: 500 });
  }

  const tenant = data.tenant as { id?: string | null; name?: string | null } | null;
  const isActive = Boolean((data as Record<string, unknown>).is_active ?? (data as Record<string, unknown>).active);
  const originHlsUrl = String((data as Record<string, unknown>).origin_hls_url ?? "").trim();

  return NextResponse.json({
    ok: true,
    channel: {
      id: String(data.id),
      name: String(data.name ?? ""),
      slug: String(data.slug ?? ""),
      tenant_id: data.tenant_id ? String(data.tenant_id) : null,
      tenant_name: tenant?.name ? String(tenant.name) : null,
      origin_hls_url: originHlsUrl || null,
      is_active: isActive,
      updated_at: data.updated_at ? String(data.updated_at) : null,
      issues: {
        missingTenant: !data.tenant_id,
        missingOrigin: !originHlsUrl,
      },
    },
  });
}

export async function POST() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const roleErr = requireRole(auth.ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  const admin = supabaseAdmin();
  const [{ data: channels, error: channelsError }, { data: streams, error: streamsError }] = await Promise.all([
    admin.from("channels").select("id,name,tenant_id,origin_hls_url").limit(1000),
    admin.from("streams").select("channel_id,tenant_id,hls_url").limit(2000),
  ]);

  if (channelsError || streamsError) {
    console.error("Superadmin channel backfill autofill load error", {
      channelsError: channelsError?.message,
      streamsError: streamsError?.message,
    });
    return NextResponse.json({ ok: false, error: "Impossible de calculer l'autofill des chaines." }, { status: 500 });
  }

  const streamsByChannel = new Map<string, Array<{ tenant_id: string | null; hls_url: string | null }>>();
  for (const stream of streams ?? []) {
    const channelId = String((stream as { channel_id?: unknown }).channel_id ?? "").trim();
    if (!channelId) continue;
    const items = streamsByChannel.get(channelId) ?? [];
    items.push({
      tenant_id: (stream as { tenant_id?: string | null }).tenant_id ?? null,
      hls_url: (stream as { hls_url?: string | null }).hls_url ?? null,
    });
    streamsByChannel.set(channelId, items);
  }

  let updated = 0;
  let updatedOrigin = 0;
  let updatedTenant = 0;
  const skipped: Array<{ id: string; name: string; reason: string }> = [];

  for (const channel of channels ?? []) {
    const channelId = String(channel.id);
    const related = streamsByChannel.get(channelId) ?? [];
    if (related.length === 0) {
      skipped.push({ id: channelId, name: String(channel.name ?? ""), reason: "Aucun stream lie." });
      continue;
    }

    const candidateUrls = Array.from(
      new Set(
        related
          .map((stream) => String(stream.hls_url ?? "").trim())
          .filter((value) => value.length > 0)
      )
    );

    const candidateTenants = Array.from(
      new Set(
        related
          .map((stream) => String(stream.tenant_id ?? "").trim())
          .filter((value) => value.length > 0)
      )
    );

    const patch: Record<string, unknown> = {};
    const hasOrigin = String((channel as { origin_hls_url?: string | null }).origin_hls_url ?? "").trim().length > 0;
    const hasTenant = Boolean((channel as { tenant_id?: string | null }).tenant_id);

    if (!hasOrigin && candidateUrls.length === 1) {
      patch.origin_hls_url = candidateUrls[0];
    }
    if (!hasTenant && candidateTenants.length === 1) {
      patch.tenant_id = candidateTenants[0];
    }

    if (Object.keys(patch).length === 0) {
      const reasons: string[] = [];
      if (!hasOrigin && candidateUrls.length !== 1) reasons.push("Origin ambiguë ou absente dans streams.");
      if (!hasTenant && candidateTenants.length !== 1) reasons.push("Tenant non déductible depuis streams.");
      skipped.push({
        id: channelId,
        name: String(channel.name ?? ""),
        reason: reasons.join(" "),
      });
      continue;
    }

    const { error } = await admin.from("channels").update(patch).eq("id", channelId);
    if (error) {
      console.error("Superadmin channel backfill autofill update error", {
        channelId,
        error: error.message,
      });
      skipped.push({ id: channelId, name: String(channel.name ?? ""), reason: "Echec de mise a jour." });
      continue;
    }

    updated += 1;
    if ("origin_hls_url" in patch) updatedOrigin += 1;
    if ("tenant_id" in patch) updatedTenant += 1;
  }

  return NextResponse.json({
    ok: true,
    updated,
    updated_origin: updatedOrigin,
    updated_tenant: updatedTenant,
    skipped_count: skipped.length,
    skipped: skipped.slice(0, 20),
  });
}

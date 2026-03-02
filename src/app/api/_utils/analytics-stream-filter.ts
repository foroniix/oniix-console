import type { SupabaseClient } from "@supabase/supabase-js";

export type AnalyticsStreamFilter = {
  mode: "all" | "none" | "ids";
  streamIds: string[];
  streamId?: string;
  channelId?: string;
};

type ResolveInput = {
  tenantId: string;
  streamId?: string | null;
  channelId?: string | null;
};

type ResolveResult =
  | { ok: true; filter: AnalyticsStreamFilter }
  | { ok: false; error: string; code?: string | null };

function cleanId(value: string | null | undefined) {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : null;
}

export async function resolveAnalyticsStreamFilter(
  sb: SupabaseClient,
  input: ResolveInput
): Promise<ResolveResult> {
  const tenantId = cleanId(input.tenantId);
  if (!tenantId) {
    return { ok: true, filter: { mode: "none", streamIds: [] } };
  }

  const streamId = cleanId(input.streamId);
  if (streamId) {
    const { data, error } = await sb
      .from("streams")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", streamId)
      .maybeSingle();

    if (error) return { ok: false, error: error.message, code: error.code };
    if (!data) return { ok: true, filter: { mode: "none", streamIds: [], streamId } };

    return { ok: true, filter: { mode: "ids", streamIds: [streamId], streamId } };
  }

  const channelId = cleanId(input.channelId);
  if (!channelId) {
    return { ok: true, filter: { mode: "all", streamIds: [] } };
  }

  const { data, error } = await sb
    .from("streams")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("channel_id", channelId)
    .limit(500);

  if (error) return { ok: false, error: error.message, code: error.code };

  const streamIds = (data ?? [])
    .map((row) => (row as { id?: string | null }).id ?? null)
    .filter((id): id is string => Boolean(id));

  if (streamIds.length === 0) {
    return { ok: true, filter: { mode: "none", streamIds: [], channelId } };
  }

  return { ok: true, filter: { mode: "ids", streamIds, channelId } };
}


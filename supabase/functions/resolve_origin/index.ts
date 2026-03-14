import { z } from "npm:zod@4";

import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { requireWorkerSecret } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const requestSchema = z.object({
  channel_id: z.string().uuid(),
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, { status: 405 });

  const auth = requireWorkerSecret(request);
  if (!auth.ok) return auth.res;

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid resolve_origin payload.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: channel, error: channelError } = await admin
    .from("channels")
    .select("id, tenant_id, origin_hls_url, is_active, active")
    .eq("id", body.channel_id)
    .maybeSingle();

  if (channelError) {
    console.error("resolve_origin channel lookup failed", channelError);
    return jsonResponse({ ok: false, error: "Channel lookup failed." }, { status: 500 });
  }
  if (!channel) {
    return jsonResponse({ ok: false, error: "Channel not found." }, { status: 404 });
  }

  const isActive = Boolean((channel as Record<string, unknown>).is_active ?? (channel as Record<string, unknown>).active);
  const originHlsUrl = String((channel as Record<string, unknown>).origin_hls_url ?? "").trim();
  if (!isActive || !originHlsUrl) {
    return jsonResponse({ ok: false, error: "Channel origin unavailable." }, { status: 404 });
  }

  return jsonResponse(
    {
      ok: true,
      channel_id: channel.id,
      tenant_id: channel.tenant_id,
      origin_hls_url: originHlsUrl,
      resolved_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    }
  );
});

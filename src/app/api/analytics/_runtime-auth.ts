import { getTenantContext } from "../tenant/_utils";
import { requireTenantIngestAuth } from "../_utils/tenant-ingest-auth";

type AnalyticsRuntimeAuthOk = {
  ok: true;
  tenantId: string;
  userId: string | null;
  source: "session" | "ingest";
  streamId?: string;
};

type AnalyticsRuntimeAuthErr = {
  ok: false;
  res: Response;
};

export async function requireAnalyticsRuntimeAuth(
  req: Request
): Promise<AnalyticsRuntimeAuthOk | AnalyticsRuntimeAuthErr> {
  const sessionCtx = await getTenantContext();
  if (sessionCtx.ok) {
    return {
      ok: true,
      tenantId: sessionCtx.tenant_id,
      userId: sessionCtx.user_id,
      source: "session",
    };
  }

  const ingestAuth = await requireTenantIngestAuth(req);
  if (!ingestAuth.ok) return ingestAuth;

  return {
    ok: true,
    tenantId: ingestAuth.tenantId,
    userId: null,
    source: "ingest",
    streamId: ingestAuth.streamId,
  };
}

import { getTenantContext, jsonError, requireTenantCapability } from "../tenant/_utils";
import { requireTenantIngestAuth } from "../_utils/tenant-ingest-auth";
import type { TenantCapability } from "@/lib/tenant-roles";

type AdRuntimeAuthOk = {
  ok: true;
  tenantId: string;
  userId: string | null;
  source: "session" | "ingest";
  streamId?: string;
};

type AdRuntimeAuthErr = {
  ok: false;
  res: Response;
};

export async function requireAdRuntimeAuth(
  req: Request,
  sessionCapability?: TenantCapability
): Promise<AdRuntimeAuthOk | AdRuntimeAuthErr> {
  const sessionCtx = await getTenantContext();
  if (sessionCtx.ok) {
    if (sessionCapability) {
      const permission = await requireTenantCapability(
        sessionCtx.sb,
        sessionCtx.tenant_id,
        sessionCtx.user_id,
        sessionCapability
      );
      if (!permission.ok) {
        return {
          ok: false,
          res: jsonError(permission.error, permission.error === "Acces refuse." ? 403 : 500),
        };
      }
    }

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

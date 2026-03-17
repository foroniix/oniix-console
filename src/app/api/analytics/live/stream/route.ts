import { parseQuery } from "../../../_utils/validate";
import { requireTenantAccess } from "../../../tenant/_utils";
import {
  ANALYTICS_LIVE_QUERY_SCHEMA,
  resolveAnalyticsLiveSnapshot,
  type AnalyticsLivePayload,
} from "../../../_utils/analytics-live";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const maxDuration = 60;

const STREAM_POLL_MS = 5_000;
const STREAM_KEEPALIVE_MS = 15_000;
const STREAM_CLOSE_MS = 55_000;

function encodeSseChunk(encoder: TextEncoder, input: string) {
  return encoder.encode(input);
}

function formatSseData(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function safeSerialize(value: AnalyticsLivePayload) {
  return JSON.stringify(value);
}

export async function GET(req: Request) {
  const ctx = await requireTenantAccess("view_analytics");
  if (!ctx.ok) return ctx.res;

  const query = parseQuery(req, ANALYTICS_LIVE_QUERY_SCHEMA);
  if (!query.ok) return query.res;

  const tenantId = ctx.tenant_id;
  const channelId = query.data.channelId ?? null;
  const streamId = query.data.streamId ?? null;
  const windowSec = query.data.windowSec ?? null;
  const sb = ctx.admin;

  const encoder = new TextEncoder();
  let cleanupRef: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let lastPayload = "";
      let inflight = false;
      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
      let closeTimer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (pollTimer) clearInterval(pollTimer);
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        if (closeTimer) clearTimeout(closeTimer);
        req.signal.removeEventListener("abort", handleAbort);
      };
      cleanupRef = cleanup;

      const close = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          // ignore close-after-close
        }
      };

      const enqueue = (value: string) => {
        if (closed) return;
        controller.enqueue(encodeSseChunk(encoder, value));
      };

      const sendSnapshot = async () => {
        if (closed || inflight) return;
        inflight = true;

        try {
          const result = await resolveAnalyticsLiveSnapshot({
            sb,
            tenantId,
            channelId,
            streamId,
            windowSec,
          });

          if (!result.ok) {
            enqueue(formatSseData("error", { error: result.error }));
            close();
            return;
          }

          const serialized = safeSerialize(result.data);
          if (serialized === lastPayload) return;
          lastPayload = serialized;
          enqueue(formatSseData("snapshot", result.data));
        } catch {
          enqueue(formatSseData("error", { error: "Une erreur est survenue." }));
          close();
        } finally {
          inflight = false;
        }
      };

      const handleAbort = () => close();

      req.signal.addEventListener("abort", handleAbort);

      enqueue("retry: 3000\n\n");
      void sendSnapshot();

      pollTimer = setInterval(() => {
        void sendSnapshot();
      }, STREAM_POLL_MS);

      keepAliveTimer = setInterval(() => {
        enqueue(": keepalive\n\n");
      }, STREAM_KEEPALIVE_MS);

      closeTimer = setTimeout(() => {
        close();
      }, STREAM_CLOSE_MS);
    },
    cancel() {
      if (cleanupRef) cleanupRef();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

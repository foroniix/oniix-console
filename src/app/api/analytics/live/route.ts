import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseQuery } from "../../_utils/validate";
import { resolveAnalyticsStreamFilter } from "../../_utils/analytics-stream-filter";
import { getStreamStatsLiveFallback } from "../../_utils/stream-stats-live-fallback";
import {
  buildLiveSnapshotFromEvents,
  clampLiveWindowSec,
  getViewerLiveSnapshot,
  type ViewerLiveEventRow,
} from "../../_utils/viewer-live";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const query = parseQuery(
    req,
    z.object({
      windowSec: z.string().optional(),
      channelId: z.string().optional(),
      streamId: z.string().optional(),
    })
  );
  if (!query.ok) return query.res;

  const windowSec = clampLiveWindowSec(query.data.windowSec ?? null);
  const supa = supabaseAdmin();

  const filterRes = await resolveAnalyticsStreamFilter(supa, {
    tenantId: ctx.tenantId,
    channelId: query.data.channelId ?? null,
    streamId: query.data.streamId ?? null,
  });
  if (!filterRes.ok) {
    console.error("Analytics live filter error", {
      error: filterRes.error,
      code: filterRes.code ?? null,
      tenantId: ctx.tenantId,
    });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  const streamFilter = filterRes.filter;
  const streamIdsForFilter =
    streamFilter.mode === "none" ? [] : streamFilter.mode === "ids" ? streamFilter.streamIds : undefined;

  const liveRes = await getViewerLiveSnapshot(supa, {
    tenantId: ctx.tenantId,
    windowSec,
    expireStale: true,
    streamIds: streamIdsForFilter,
  });

  if (liveRes.ok) {
    if (streamFilter.mode !== "none" && liveRes.snapshot.activeUsers === 0) {
      const streamStatsFallback = await getStreamStatsLiveFallback(supa, {
        tenantId: ctx.tenantId,
        windowSec,
        streamIds: streamIdsForFilter,
      });
      if (streamStatsFallback.ok && streamStatsFallback.snapshot.activeUsers > 0) {
        return NextResponse.json({
          ok: true,
          live: {
            activeUsers: streamStatsFallback.snapshot.activeUsers,
            currentStreams: streamStatsFallback.snapshot.currentStreams,
          },
          sessions: [],
          asOf: streamStatsFallback.snapshot.asOf,
          windowSec: streamStatsFallback.snapshot.windowSec,
          source: streamStatsFallback.snapshot.source,
        });
      }
      if (!streamStatsFallback.ok) {
        console.error("Analytics live stream_stats fallback error", {
          error: streamStatsFallback.error,
          code: streamStatsFallback.code ?? null,
          tenantId: ctx.tenantId,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      live: {
        activeUsers: liveRes.snapshot.activeUsers,
        currentStreams: liveRes.snapshot.currentStreams,
      },
      sessions: liveRes.snapshot.sessions,
      asOf: liveRes.snapshot.asOf,
      windowSec: liveRes.snapshot.windowSec,
      source: liveRes.snapshot.source,
    });
  }

  if (!liveRes.tableMissing) {
    console.error("Analytics live snapshot error", {
      error: liveRes.error ?? "unknown",
      code: liveRes.code ?? null,
      tenantId: ctx.tenantId,
    });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  const liveThreshold = new Date(Date.now() - windowSec * 1000).toISOString();
  let fallbackQuery = supa
    .from("analytics_events")
    .select("created_at, session_id, stream_id, event_type")
    .eq("tenant_id", ctx.tenantId)
    .gte("created_at", liveThreshold);

  if (streamFilter.mode === "ids" && streamFilter.streamIds.length === 1) {
    fallbackQuery = fallbackQuery.eq("stream_id", streamFilter.streamIds[0]);
  } else if (streamFilter.mode === "ids" && streamFilter.streamIds.length > 1) {
    fallbackQuery = fallbackQuery.in("stream_id", streamFilter.streamIds);
  } else if (streamFilter.mode === "none") {
    fallbackQuery = fallbackQuery.eq("stream_id", "__none__");
  }

  const fallbackRes = await fallbackQuery.order("created_at", { ascending: true });

  if (fallbackRes.error) {
    console.error("Analytics live fallback error", {
      error: fallbackRes.error.message,
      code: fallbackRes.error.code,
      tenantId: ctx.tenantId,
    });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  const fallbackSnapshot = buildLiveSnapshotFromEvents(
    (fallbackRes.data ?? []) as ViewerLiveEventRow[],
    { windowSec }
  );

  if (streamFilter.mode !== "none" && fallbackSnapshot.activeUsers === 0) {
    const streamStatsFallback = await getStreamStatsLiveFallback(supa, {
      tenantId: ctx.tenantId,
      windowSec,
      streamIds: streamIdsForFilter,
    });
    if (streamStatsFallback.ok && streamStatsFallback.snapshot.activeUsers > 0) {
      return NextResponse.json({
        ok: true,
        live: {
          activeUsers: streamStatsFallback.snapshot.activeUsers,
          currentStreams: streamStatsFallback.snapshot.currentStreams,
        },
        sessions: [],
        asOf: streamStatsFallback.snapshot.asOf,
        windowSec: streamStatsFallback.snapshot.windowSec,
        source: streamStatsFallback.snapshot.source,
      });
    }
    if (!streamStatsFallback.ok) {
      console.error("Analytics live stream_stats fallback error", {
        error: streamStatsFallback.error,
        code: streamStatsFallback.code ?? null,
        tenantId: ctx.tenantId,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    live: {
      activeUsers: fallbackSnapshot.activeUsers,
      currentStreams: fallbackSnapshot.currentStreams,
    },
    sessions: fallbackSnapshot.sessions,
    asOf: fallbackSnapshot.asOf,
    windowSec: fallbackSnapshot.windowSec,
    source: fallbackSnapshot.source,
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { buildHlsClip } from "../../_utils/hls-clip";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { auditLog } from "../../_utils/audit";
import { supabaseUser } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

type JobRow = {
  id: string;
  replay_id: string;
  stream_id: string | null;
  source_hls_url: string;
  clip_start_at: string;
  clip_end_at: string;
  base_url: string | null;
  attempts: number | null;
};

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const parsed = await parseJson(
    req,
    z.object({
      limit: z.number().int().min(1).max(5).optional(),
    })
  );
  if (!parsed.ok) return parsed.res;

  const limit = parsed.data.limit ?? 1;
  const supa = supabaseUser(ctx.accessToken);

  const { data: jobs, error: jobsError } = await supa
    .from("replay_generation_jobs")
    .select("id,replay_id,stream_id,source_hls_url,clip_start_at,clip_end_at,base_url,attempts")
    .eq("tenant_id", ctx.tenantId)
    .in("status", ["queued", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (jobsError) {
    console.error("Replay process jobs load error", {
      tenantId: ctx.tenantId,
      error: jobsError.message,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const processed: Array<{
    jobId: string;
    replayId: string;
    status: "done" | "failed";
    message: string;
  }> = [];

  for (const rawJob of (jobs ?? []) as JobRow[]) {
    const startedAt = new Date().toISOString();

    const { error: lockError } = await supa
      .from("replay_generation_jobs")
      .update({
        status: "processing",
        attempts: (rawJob.attempts ?? 0) + 1,
        started_at: startedAt,
        updated_at: startedAt,
        error: null,
      })
      .eq("tenant_id", ctx.tenantId)
      .eq("id", rawJob.id);

    if (lockError) {
      console.error("Replay process job lock error", {
        tenantId: ctx.tenantId,
        jobId: rawJob.id,
        error: lockError.message,
      });
      processed.push({
        jobId: rawJob.id,
        replayId: rawJob.replay_id,
        status: "failed",
        message: "Job lock failed",
      });
      continue;
    }

    try {
      const clip = await buildHlsClip({
        sourceUrl: rawJob.source_hls_url,
        clipStartAt: rawJob.clip_start_at,
        clipEndAt: rawJob.clip_end_at,
      });

      const baseUrl = (rawJob.base_url ?? req.nextUrl.origin).replace(/\/$/, "");
      const clipUrl = `${baseUrl}/api/replays/${rawJob.replay_id}/clip`;
      const finishedAt = new Date().toISOString();

      const { error: replayError } = await supa
        .from("replays")
        .update({
          replay_status: "ready",
          hls_url: clipUrl,
          source_hls_url: rawJob.source_hls_url,
          clip_start_at: rawJob.clip_start_at,
          clip_end_at: rawJob.clip_end_at,
          duration_sec: clip.durationSec,
          generated_manifest: clip.manifest,
          processing_error: null,
          last_processed_at: finishedAt,
          updated_at: finishedAt,
          updated_by: ctx.userId,
        })
        .eq("tenant_id", ctx.tenantId)
        .eq("id", rawJob.replay_id);

      if (replayError) {
        throw new Error(`Replay update failed: ${replayError.message}`);
      }

      const { error: jobDoneError } = await supa
        .from("replay_generation_jobs")
        .update({
          status: "done",
          error: null,
          result: {
            segmentCount: clip.segmentCount,
            durationSec: clip.durationSec,
            sourceMediaUrl: clip.sourceMediaUrl,
            firstProgramDateTime: clip.firstProgramDateTime,
            lastProgramDateTime: clip.lastProgramDateTime,
            hlsUrl: clipUrl,
          },
          finished_at: finishedAt,
          updated_at: finishedAt,
        })
        .eq("tenant_id", ctx.tenantId)
        .eq("id", rawJob.id);

      if (jobDoneError) {
        throw new Error(`Job finalize failed: ${jobDoneError.message}`);
      }

      await auditLog({
        sb: supa,
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: "replay.clip_ready",
        targetType: "replay",
        targetId: rawJob.replay_id,
        metadata: {
          replayId: rawJob.replay_id,
          jobId: rawJob.id,
          segmentCount: clip.segmentCount,
          durationSec: clip.durationSec,
        },
      });

      processed.push({
        jobId: rawJob.id,
        replayId: rawJob.replay_id,
        status: "done",
        message: "Clip generated",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failedAt = new Date().toISOString();

      const { error: replayFailError } = await supa
        .from("replays")
        .update({
          replay_status: "draft",
          processing_error: message,
          updated_at: failedAt,
          updated_by: ctx.userId,
        })
        .eq("tenant_id", ctx.tenantId)
        .eq("id", rawJob.replay_id);

      if (replayFailError) {
        console.error("Replay process replay fail update error", {
          tenantId: ctx.tenantId,
          replayId: rawJob.replay_id,
          error: replayFailError.message,
        });
      }

      const { error: jobFailError } = await supa
        .from("replay_generation_jobs")
        .update({
          status: "failed",
          error: message,
          finished_at: failedAt,
          updated_at: failedAt,
        })
        .eq("tenant_id", ctx.tenantId)
        .eq("id", rawJob.id);

      if (jobFailError) {
        console.error("Replay process job fail update error", {
          tenantId: ctx.tenantId,
          jobId: rawJob.id,
          error: jobFailError.message,
        });
      }

      await auditLog({
        sb: supa,
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: "replay.clip_failed",
        targetType: "replay",
        targetId: rawJob.replay_id,
        metadata: {
          replayId: rawJob.replay_id,
          jobId: rawJob.id,
          error: message,
        },
      });

      processed.push({
        jobId: rawJob.id,
        replayId: rawJob.replay_id,
        status: "failed",
        message,
      });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      processed,
      done: processed.filter((item) => item.status === "done").length,
      failed: processed.filter((item) => item.status === "failed").length,
    },
    { status: 200 }
  );
}

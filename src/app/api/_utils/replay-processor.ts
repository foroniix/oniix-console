import type { SupabaseClient } from "@supabase/supabase-js";

import { auditLog } from "./audit";
import { buildHlsClip } from "./hls-clip";

type JobStatus = "queued" | "processing" | "done" | "failed";

type ReplayJobRow = {
  id: string;
  tenant_id: string;
  replay_id: string;
  stream_id: string | null;
  source_hls_url: string;
  clip_start_at: string;
  clip_end_at: string;
  base_url: string | null;
  attempts: number | null;
  status: JobStatus;
  requested_by: string | null;
};

type ProcessedReplayJob = {
  jobId: string;
  replayId: string;
  status: "done" | "failed";
  message: string;
};

type ProcessReplayJobsInput = {
  sb: SupabaseClient;
  tenantId?: string | null;
  actorUserId?: string | null;
  fallbackBaseUrl: string;
  limit: number;
  includeFailed?: boolean;
};

type ProcessReplayJobsOk = {
  ok: true;
  processed: ProcessedReplayJob[];
  done: number;
  failed: number;
};

type ProcessReplayJobsErr = {
  ok: false;
  error: string;
};

type ProcessReplayJobsResult = ProcessReplayJobsOk | ProcessReplayJobsErr;

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

export async function processReplayGenerationJobs(
  input: ProcessReplayJobsInput
): Promise<ProcessReplayJobsResult> {
  const { sb, tenantId, actorUserId, fallbackBaseUrl, limit, includeFailed = true } = input;

  let jobsQuery = sb
    .from("replay_generation_jobs")
    .select(
      "id,tenant_id,replay_id,stream_id,source_hls_url,clip_start_at,clip_end_at,base_url,attempts,status,requested_by"
    )
    .in("status", includeFailed ? ["queued", "failed"] : ["queued"])
    .order("created_at", { ascending: true })
    .limit(limit);
  if (tenantId) {
    jobsQuery = jobsQuery.eq("tenant_id", tenantId);
  }

  const { data: jobs, error: jobsError } = await jobsQuery;

  if (jobsError) {
    return { ok: false, error: jobsError.message };
  }

  const processed: ProcessedReplayJob[] = [];

  for (const rawJob of (jobs ?? []) as ReplayJobRow[]) {
    const startedAt = new Date().toISOString();
    const { data: lockData, error: lockError } = await sb
      .from("replay_generation_jobs")
      .update({
        status: "processing",
        attempts: (rawJob.attempts ?? 0) + 1,
        started_at: startedAt,
        updated_at: startedAt,
        error: null,
      })
      .eq("tenant_id", rawJob.tenant_id)
      .eq("id", rawJob.id)
      .eq("status", rawJob.status)
      .select("id")
      .maybeSingle();

    if (lockError || !lockData?.id) {
      processed.push({
        jobId: rawJob.id,
        replayId: rawJob.replay_id,
        status: "failed",
        message: lockError?.message || "Job lock failed",
      });
      continue;
    }

    try {
      const clip = await buildHlsClip({
        sourceUrl: rawJob.source_hls_url,
        clipStartAt: rawJob.clip_start_at,
        clipEndAt: rawJob.clip_end_at,
      });

      const baseUrl = normalizeBaseUrl(rawJob.base_url ?? fallbackBaseUrl);
      const clipUrl = `${baseUrl}/api/replays/${rawJob.replay_id}/clip`;
      const finishedAt = new Date().toISOString();
      const replaySuccessPayload: Record<string, unknown> = {
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
      };
      const replayActor = actorUserId ?? rawJob.requested_by ?? null;
      if (replayActor) replaySuccessPayload.updated_by = replayActor;

      const { error: replayError } = await sb
        .from("replays")
        .update(replaySuccessPayload)
        .eq("tenant_id", rawJob.tenant_id)
        .eq("id", rawJob.replay_id);

      if (replayError) {
        throw new Error(`Replay update failed: ${replayError.message}`);
      }

      const { error: jobDoneError } = await sb
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
        .eq("tenant_id", rawJob.tenant_id)
        .eq("id", rawJob.id);

      if (jobDoneError) {
        throw new Error(`Job finalize failed: ${jobDoneError.message}`);
      }

      await auditLog({
        sb,
        tenantId: rawJob.tenant_id,
        actorUserId: replayActor,
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

      const replayFailPayload: Record<string, unknown> = {
        replay_status: "draft",
        processing_error: message,
        updated_at: failedAt,
      };
      const replayActor = actorUserId ?? rawJob.requested_by ?? null;
      if (replayActor) replayFailPayload.updated_by = replayActor;

      const { error: replayFailError } = await sb
        .from("replays")
        .update(replayFailPayload)
        .eq("tenant_id", rawJob.tenant_id)
        .eq("id", rawJob.replay_id);

      if (replayFailError) {
        console.error("Replay process replay fail update error", {
          tenantId: rawJob.tenant_id,
          replayId: rawJob.replay_id,
          error: replayFailError.message,
        });
      }

      const { error: jobFailError } = await sb
        .from("replay_generation_jobs")
        .update({
          status: "failed",
          error: message,
          finished_at: failedAt,
          updated_at: failedAt,
        })
        .eq("tenant_id", rawJob.tenant_id)
        .eq("id", rawJob.id);

      if (jobFailError) {
        console.error("Replay process job fail update error", {
          tenantId: rawJob.tenant_id,
          jobId: rawJob.id,
          error: jobFailError.message,
        });
      }

      await auditLog({
        sb,
        tenantId: rawJob.tenant_id,
        actorUserId: replayActor,
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

  return {
    ok: true,
    processed,
    done: processed.filter((item) => item.status === "done").length,
    failed: processed.filter((item) => item.status === "failed").length,
  };
}

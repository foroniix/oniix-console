-- Replay clip jobs (start/end window) for continuous HLS streams.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

alter table public.replays add column if not exists source_hls_url text null;
alter table public.replays add column if not exists clip_start_at timestamptz null;
alter table public.replays add column if not exists clip_end_at timestamptz null;
alter table public.replays add column if not exists generated_manifest text null;
alter table public.replays add column if not exists processing_error text null;
alter table public.replays add column if not exists last_processed_at timestamptz null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'replays_status_check'
  ) then
    alter table public.replays drop constraint replays_status_check;
  end if;

  alter table public.replays
    add constraint replays_status_check
    check (replay_status in ('draft', 'processing', 'ready', 'published', 'archived'));
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'replays_clip_window_check'
  ) then
    alter table public.replays
      add constraint replays_clip_window_check
      check (
        clip_start_at is null
        or clip_end_at is null
        or clip_end_at > clip_start_at
      );
  end if;
end $$;

create table if not exists public.replay_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  replay_id uuid not null references public.replays(id) on delete cascade,
  stream_id uuid null,
  source_hls_url text not null,
  clip_start_at timestamptz not null,
  clip_end_at timestamptz not null,
  requested_by uuid null,
  base_url text null,
  status text not null default 'queued',
  attempts integer not null default 0,
  error text null,
  result jsonb not null default '{}'::jsonb,
  started_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'replay_generation_jobs_status_check'
  ) then
    alter table public.replay_generation_jobs
      add constraint replay_generation_jobs_status_check
      check (status in ('queued', 'processing', 'done', 'failed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'replay_generation_jobs_window_check'
  ) then
    alter table public.replay_generation_jobs
      add constraint replay_generation_jobs_window_check
      check (clip_end_at > clip_start_at);
  end if;
end $$;

create index if not exists idx_replay_generation_jobs_tenant_status_created
  on public.replay_generation_jobs (tenant_id, status, created_at asc);

create index if not exists idx_replay_generation_jobs_replay
  on public.replay_generation_jobs (replay_id);

alter table public.replay_generation_jobs enable row level security;

drop policy if exists replay_generation_jobs_select_self on public.replay_generation_jobs;
create policy replay_generation_jobs_select_self
on public.replay_generation_jobs
for select
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = replay_generation_jobs.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists replay_generation_jobs_insert_self on public.replay_generation_jobs;
create policy replay_generation_jobs_insert_self
on public.replay_generation_jobs
for insert
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = replay_generation_jobs.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists replay_generation_jobs_update_self on public.replay_generation_jobs;
create policy replay_generation_jobs_update_self
on public.replay_generation_jobs
for update
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = replay_generation_jobs.tenant_id
      and tm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = replay_generation_jobs.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists replay_generation_jobs_delete_self on public.replay_generation_jobs;
create policy replay_generation_jobs_delete_self
on public.replay_generation_jobs
for delete
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = replay_generation_jobs.tenant_id
      and tm.user_id = auth.uid()
  )
);

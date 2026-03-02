-- Live viewer session state (tenant-scoped).
-- This table is the source of truth for realtime audience counts.

create table if not exists public.viewer_sessions_live (
  tenant_id uuid not null,
  session_id text not null,
  stream_id text null,
  user_id uuid null,
  device_type text null,
  is_active boolean not null default true,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz null,
  ended_reason text null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, session_id)
);

create index if not exists viewer_sessions_live_active_last_seen_idx
  on public.viewer_sessions_live (tenant_id, last_seen_at desc)
  where is_active = true;

create index if not exists viewer_sessions_live_active_stream_idx
  on public.viewer_sessions_live (tenant_id, stream_id, last_seen_at desc)
  where is_active = true;

alter table public.viewer_sessions_live enable row level security;

drop policy if exists viewer_sessions_live_read_tenant
on public.viewer_sessions_live;

create policy viewer_sessions_live_read_tenant
on public.viewer_sessions_live
for select
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = viewer_sessions_live.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists viewer_sessions_live_insert_tenant
on public.viewer_sessions_live;

create policy viewer_sessions_live_insert_tenant
on public.viewer_sessions_live
for insert
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = viewer_sessions_live.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists viewer_sessions_live_update_tenant
on public.viewer_sessions_live;

create policy viewer_sessions_live_update_tenant
on public.viewer_sessions_live
for update
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = viewer_sessions_live.tenant_id
      and tm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = viewer_sessions_live.tenant_id
      and tm.user_id = auth.uid()
  )
);

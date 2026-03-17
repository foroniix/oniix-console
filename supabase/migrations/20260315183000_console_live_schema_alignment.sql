-- Align the versioned schema with the current console/live code expectations.
-- Safe to run on existing environments.

create extension if not exists pgcrypto;

create or replace function public.sync_channel_active_flags()
returns trigger
language plpgsql
as $$
declare
  next_value boolean;
begin
  next_value = coalesce(new.active, new.is_active, true);
  new.active = next_value;
  new.is_active = next_value;
  return new;
end;
$$;

alter table public.channels
  add column if not exists category text,
  add column if not exists logo text,
  add column if not exists active boolean;

update public.channels
set category = 'Autre'
where category is null or btrim(category) = '';

update public.channels
set active = coalesce(active, is_active, true)
where active is distinct from coalesce(active, is_active, true);

update public.channels
set is_active = coalesce(is_active, active, true)
where is_active is distinct from coalesce(is_active, active, true);

alter table public.channels
  alter column category set default 'Autre',
  alter column active set default true,
  alter column is_active set default true;

update public.channels
set active = true
where active is null;

update public.channels
set is_active = true
where is_active is null;

alter table public.channels
  alter column category set not null,
  alter column active set not null,
  alter column is_active set not null;

drop trigger if exists sync_channels_active_flags on public.channels;
create trigger sync_channels_active_flags
before insert or update on public.channels
for each row execute function public.sync_channel_active_flags();

create index if not exists channels_tenant_active_idx
  on public.channels (tenant_id, active);

create table if not exists public.streams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_id uuid null references public.channels(id) on delete set null,
  title text not null,
  hls_url text null,
  status text not null default 'OFFLINE',
  scheduled_at timestamptz null,
  description text null,
  poster text null,
  latency text not null default 'normal',
  dvr_window_sec integer not null default 10800,
  record boolean not null default true,
  drm boolean not null default false,
  captions jsonb not null default '[]'::jsonb,
  markers jsonb not null default '[]'::jsonb,
  geo jsonb not null default '{"allow":[],"block":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.streams
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists channel_id uuid references public.channels(id) on delete set null,
  add column if not exists title text,
  add column if not exists hls_url text,
  add column if not exists status text,
  add column if not exists scheduled_at timestamptz null,
  add column if not exists description text null,
  add column if not exists poster text null,
  add column if not exists latency text,
  add column if not exists dvr_window_sec integer,
  add column if not exists record boolean,
  add column if not exists drm boolean,
  add column if not exists captions jsonb,
  add column if not exists markers jsonb,
  add column if not exists geo jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.streams
set title = coalesce(nullif(title, ''), 'Live')
where title is null or title = '';

update public.streams
set status = coalesce(nullif(status, ''), 'OFFLINE')
where status is null or status = '';

update public.streams
set latency = coalesce(nullif(latency, ''), 'normal')
where latency is null or latency = '';

update public.streams
set dvr_window_sec = 10800
where dvr_window_sec is null;

update public.streams
set record = true
where record is null;

update public.streams
set drm = false
where drm is null;

update public.streams
set captions = '[]'::jsonb
where captions is null;

update public.streams
set markers = '[]'::jsonb
where markers is null;

update public.streams
set geo = '{"allow":[],"block":[]}'::jsonb
where geo is null;

alter table public.streams
  alter column title set default 'Live',
  alter column status set default 'OFFLINE',
  alter column latency set default 'normal',
  alter column dvr_window_sec set default 10800,
  alter column record set default true,
  alter column drm set default false,
  alter column captions set default '[]'::jsonb,
  alter column markers set default '[]'::jsonb,
  alter column geo set default '{"allow":[],"block":[]}'::jsonb;

alter table public.streams
  alter column title set not null,
  alter column status set not null,
  alter column latency set not null,
  alter column dvr_window_sec set not null,
  alter column record set not null,
  alter column drm set not null,
  alter column captions set not null,
  alter column markers set not null,
  alter column geo set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'streams_status_check'
  ) then
    alter table public.streams
      add constraint streams_status_check
      check (status in ('OFFLINE', 'LIVE', 'ENDED'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'streams_latency_check'
  ) then
    alter table public.streams
      add constraint streams_latency_check
      check (latency in ('normal', 'low', 'ultra-low'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'streams_dvr_window_sec_check'
  ) then
    alter table public.streams
      add constraint streams_dvr_window_sec_check
      check (dvr_window_sec >= 0);
  end if;
end $$;

create index if not exists streams_tenant_id_idx
  on public.streams (tenant_id);

create index if not exists streams_tenant_created_at_idx
  on public.streams (tenant_id, created_at desc);

create index if not exists streams_tenant_channel_idx
  on public.streams (tenant_id, channel_id);

create index if not exists streams_tenant_status_idx
  on public.streams (tenant_id, status, updated_at desc);

drop trigger if exists set_streams_updated_at on public.streams;
create trigger set_streams_updated_at
before update on public.streams
for each row execute function public.set_updated_at();

alter table public.streams enable row level security;

drop policy if exists streams_read_scoped on public.streams;
create policy streams_read_scoped
on public.streams
for select
using (public.is_oniix_admin() or public.has_tenant_membership(tenant_id));

drop policy if exists streams_write_scoped on public.streams;
create policy streams_write_scoped
on public.streams
for all
using (public.is_oniix_admin() or public.is_tenant_admin(tenant_id))
with check (public.is_oniix_admin() or public.is_tenant_admin(tenant_id));

create table if not exists public.analytics_events (
  id bigint generated by default as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stream_id uuid null references public.streams(id) on delete set null,
  session_id text not null,
  user_id uuid null,
  event_type text not null,
  device_type text null,
  os text null,
  country text null,
  created_at timestamptz not null default now()
);

alter table public.analytics_events
  add column if not exists id bigint generated by default as identity,
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists stream_id uuid null references public.streams(id) on delete set null,
  add column if not exists session_id text,
  add column if not exists user_id uuid null,
  add column if not exists event_type text,
  add column if not exists device_type text null,
  add column if not exists os text null,
  add column if not exists country text null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists analytics_events_tenant_created_at_idx
  on public.analytics_events (tenant_id, created_at desc);

create index if not exists analytics_events_tenant_stream_created_at_idx
  on public.analytics_events (tenant_id, stream_id, created_at desc);

create index if not exists analytics_events_tenant_session_created_at_idx
  on public.analytics_events (tenant_id, session_id, created_at desc);

create index if not exists analytics_events_tenant_event_created_at_idx
  on public.analytics_events (tenant_id, event_type, created_at desc);

alter table public.analytics_events enable row level security;

drop policy if exists analytics_events_read_scoped on public.analytics_events;
create policy analytics_events_read_scoped
on public.analytics_events
for select
using (public.is_oniix_admin() or public.has_tenant_membership(tenant_id));

revoke insert, update, delete on public.analytics_events from anon, authenticated;

create table if not exists public.viewer_sessions_live (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
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

alter table public.viewer_sessions_live
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists session_id text,
  add column if not exists stream_id text null,
  add column if not exists user_id uuid null,
  add column if not exists device_type text null,
  add column if not exists is_active boolean not null default true,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists ended_at timestamptz null,
  add column if not exists ended_reason text null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists viewer_sessions_live_active_last_seen_idx
  on public.viewer_sessions_live (tenant_id, last_seen_at desc)
  where is_active = true;

create index if not exists viewer_sessions_live_active_stream_idx
  on public.viewer_sessions_live (tenant_id, stream_id, last_seen_at desc)
  where is_active = true;

alter table public.viewer_sessions_live enable row level security;

drop policy if exists viewer_sessions_live_read_tenant on public.viewer_sessions_live;
create policy viewer_sessions_live_read_tenant
on public.viewer_sessions_live
for select
using (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
);

drop policy if exists viewer_sessions_live_insert_tenant on public.viewer_sessions_live;
create policy viewer_sessions_live_insert_tenant
on public.viewer_sessions_live
for insert
with check (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
);

drop policy if exists viewer_sessions_live_update_tenant on public.viewer_sessions_live;
create policy viewer_sessions_live_update_tenant
on public.viewer_sessions_live
for update
using (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
)
with check (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
);

create table if not exists public.stream_stats (
  id bigint generated by default as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stream_id uuid not null references public.streams(id) on delete cascade,
  viewers integer not null default 0,
  bitrate_kbps integer not null default 0,
  errors integer not null default 0,
  fps integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.stream_stats
  add column if not exists id bigint generated by default as identity,
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists stream_id uuid references public.streams(id) on delete cascade,
  add column if not exists viewers integer not null default 0,
  add column if not exists bitrate_kbps integer not null default 0,
  add column if not exists errors integer not null default 0,
  add column if not exists fps integer not null default 0,
  add column if not exists created_at timestamptz not null default now();

update public.stream_stats
set viewers = 0
where viewers is null;

update public.stream_stats
set bitrate_kbps = 0
where bitrate_kbps is null;

update public.stream_stats
set errors = 0
where errors is null;

update public.stream_stats
set fps = 0
where fps is null;

alter table public.stream_stats
  alter column viewers set default 0,
  alter column bitrate_kbps set default 0,
  alter column errors set default 0,
  alter column fps set default 0;

create index if not exists stream_stats_tenant_created_at_idx
  on public.stream_stats (tenant_id, created_at desc);

create index if not exists stream_stats_tenant_stream_created_at_idx
  on public.stream_stats (tenant_id, stream_id, created_at desc);

alter table public.stream_stats enable row level security;

drop policy if exists stream_stats_read_scoped on public.stream_stats;
create policy stream_stats_read_scoped
on public.stream_stats
for select
using (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
);

drop policy if exists stream_stats_insert_scoped on public.stream_stats;
create policy stream_stats_insert_scoped
on public.stream_stats
for insert
with check (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
);

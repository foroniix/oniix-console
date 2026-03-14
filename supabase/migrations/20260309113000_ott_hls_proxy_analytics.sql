-- OTT HLS proxy + mobile analytics + tenant dashboards
-- Safe to run on an existing multi-tenant console schema.

create extension if not exists pgcrypto;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function public.is_oniix_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('superadmin', 'oniix_admin', 'platform_admin');
$$;

create or replace function public.has_tenant_membership(target_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.is_tenant_admin(target_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.tenants
  add column if not exists name text,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text,
  origin_hls_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.channels
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists origin_hls_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'channels'
      and column_name = 'active'
  ) then
    execute $sql$
      update public.channels
      set is_active = coalesce(active, is_active, true)
      where is_active is distinct from coalesce(active, is_active, true)
    $sql$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'channels_origin_hls_url_required'
  ) then
    alter table public.channels
      add constraint channels_origin_hls_url_required
      check (origin_hls_url is not null) not valid;
  end if;
end $$;

create unique index if not exists channels_slug_key
  on public.channels (slug)
  where slug is not null;

create index if not exists channels_tenant_id_idx
  on public.channels (tenant_id);

drop trigger if exists set_channels_updated_at on public.channels;
create trigger set_channels_updated_at
before update on public.channels
for each row execute function public.set_updated_at();

create table if not exists public.playback_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid null,
  device_id text null,
  platform text not null,
  app_version text null,
  network_type text null,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  ended_reason text null,
  last_heartbeat_at timestamptz null,
  client_ip text null,
  country text null,
  asn text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.playback_sessions
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists channel_id uuid references public.channels(id) on delete cascade,
  add column if not exists user_id uuid null,
  add column if not exists device_id text null,
  add column if not exists platform text,
  add column if not exists app_version text null,
  add column if not exists network_type text null,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists ended_at timestamptz null,
  add column if not exists ended_reason text null,
  add column if not exists last_heartbeat_at timestamptz null,
  add column if not exists client_ip text null,
  add column if not exists country text null,
  add column if not exists asn text null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'playback_sessions_platform_check'
  ) then
    alter table public.playback_sessions
      add constraint playback_sessions_platform_check
      check (platform in ('ios', 'android'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'playback_sessions_end_after_start_check'
  ) then
    alter table public.playback_sessions
      add constraint playback_sessions_end_after_start_check
      check (ended_at is null or ended_at >= started_at);
  end if;
end $$;

create index if not exists playback_sessions_tenant_id_idx
  on public.playback_sessions (tenant_id);

create index if not exists playback_sessions_channel_id_idx
  on public.playback_sessions (channel_id);

create index if not exists playback_sessions_last_heartbeat_idx
  on public.playback_sessions (tenant_id, channel_id, last_heartbeat_at desc);

drop trigger if exists set_playback_sessions_updated_at on public.playback_sessions;
create trigger set_playback_sessions_updated_at
before update on public.playback_sessions
for each row execute function public.set_updated_at();

create table if not exists public.playback_events (
  id bigserial primary key,
  session_id uuid not null references public.playback_sessions(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  ts timestamptz not null,
  event_type text not null,
  playhead_sec integer null,
  bitrate integer null,
  resolution text null,
  network_type text null,
  device_model text null,
  os_version text null,
  app_version text null,
  error_code text null,
  error_detail text null,
  extra jsonb null,
  created_at timestamptz not null default now()
);

alter table public.playback_events
  add column if not exists session_id uuid references public.playback_sessions(id) on delete cascade,
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists channel_id uuid references public.channels(id) on delete cascade,
  add column if not exists ts timestamptz,
  add column if not exists event_type text,
  add column if not exists playhead_sec integer null,
  add column if not exists bitrate integer null,
  add column if not exists resolution text null,
  add column if not exists network_type text null,
  add column if not exists device_model text null,
  add column if not exists os_version text null,
  add column if not exists app_version text null,
  add column if not exists error_code text null,
  add column if not exists error_detail text null,
  add column if not exists extra jsonb null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists playback_events_tenant_ts_idx
  on public.playback_events (tenant_id, ts desc);

create index if not exists playback_events_channel_ts_idx
  on public.playback_events (channel_id, ts desc);

create index if not exists playback_events_session_ts_idx
  on public.playback_events (session_id, ts asc);

create table if not exists public.channel_health (
  channel_id uuid primary key references public.channels(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  last_check_at timestamptz null,
  status text not null default 'down',
  master_playlist_http_code integer null,
  media_playlist_http_code integer null,
  segment_http_code integer null,
  message text null,
  updated_at timestamptz not null default now()
);

alter table public.channel_health
  add column if not exists channel_id uuid references public.channels(id) on delete cascade,
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists last_check_at timestamptz null,
  add column if not exists status text not null default 'down',
  add column if not exists master_playlist_http_code integer null,
  add column if not exists media_playlist_http_code integer null,
  add column if not exists segment_http_code integer null,
  add column if not exists message text null,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'channel_health_status_check'
  ) then
    alter table public.channel_health
      add constraint channel_health_status_check
      check (status in ('ok', 'degraded', 'down'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'channel_health_pkey'
  ) then
    alter table public.channel_health
      add constraint channel_health_pkey primary key (channel_id);
  end if;
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

create index if not exists channel_health_tenant_id_idx
  on public.channel_health (tenant_id);

drop trigger if exists set_channel_health_updated_at on public.channel_health;
create trigger set_channel_health_updated_at
before update on public.channel_health
for each row execute function public.set_updated_at();

create table if not exists public.channel_stats_minute (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  bucket_minute timestamptz not null,
  active_viewers integer not null default 0,
  sessions_started integer not null default 0,
  watch_seconds integer not null default 0,
  buffer_seconds integer not null default 0,
  error_count integer not null default 0,
  plays integer not null default 0,
  primary key (tenant_id, channel_id, bucket_minute)
);

alter table public.channel_stats_minute
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists channel_id uuid references public.channels(id) on delete cascade,
  add column if not exists bucket_minute timestamptz,
  add column if not exists active_viewers integer not null default 0,
  add column if not exists sessions_started integer not null default 0,
  add column if not exists watch_seconds integer not null default 0,
  add column if not exists buffer_seconds integer not null default 0,
  add column if not exists error_count integer not null default 0,
  add column if not exists plays integer not null default 0;

create index if not exists channel_stats_minute_tenant_bucket_idx
  on public.channel_stats_minute (tenant_id, bucket_minute desc);

create index if not exists channel_stats_minute_channel_bucket_idx
  on public.channel_stats_minute (channel_id, bucket_minute desc);

create table if not exists public.channel_realtime_presence (
  session_id uuid primary key references public.playback_sessions(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  last_seen_at timestamptz not null,
  is_playing boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.channel_realtime_presence
  add column if not exists session_id uuid references public.playback_sessions(id) on delete cascade,
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists channel_id uuid references public.channels(id) on delete cascade,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists is_playing boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'channel_realtime_presence_pkey'
  ) then
    alter table public.channel_realtime_presence
      add constraint channel_realtime_presence_pkey primary key (session_id);
  end if;
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

create index if not exists channel_realtime_presence_tenant_last_seen_idx
  on public.channel_realtime_presence (tenant_id, last_seen_at desc);

create index if not exists channel_realtime_presence_channel_last_seen_idx
  on public.channel_realtime_presence (channel_id, last_seen_at desc);

drop trigger if exists set_channel_realtime_presence_updated_at on public.channel_realtime_presence;
create trigger set_channel_realtime_presence_updated_at
before update on public.channel_realtime_presence
for each row execute function public.set_updated_at();

alter table public.tenants enable row level security;
alter table public.channels enable row level security;
alter table public.playback_sessions enable row level security;
alter table public.playback_events enable row level security;
alter table public.channel_health enable row level security;
alter table public.channel_stats_minute enable row level security;
alter table public.channel_realtime_presence enable row level security;

drop policy if exists tenants_read_scoped on public.tenants;
create policy tenants_read_scoped
on public.tenants
for select
using (public.is_oniix_admin() or public.has_tenant_membership(id));

drop policy if exists tenants_write_admin on public.tenants;
create policy tenants_write_admin
on public.tenants
for all
using (public.is_oniix_admin())
with check (public.is_oniix_admin());

drop policy if exists channels_read_scoped on public.channels;
create policy channels_read_scoped
on public.channels
for select
using (public.is_oniix_admin() or public.has_tenant_membership(tenant_id));

drop policy if exists channels_write_scoped on public.channels;
create policy channels_write_scoped
on public.channels
for all
using (public.is_oniix_admin() or public.is_tenant_admin(tenant_id))
with check (public.is_oniix_admin() or public.is_tenant_admin(tenant_id));

drop policy if exists playback_sessions_read_scoped on public.playback_sessions;
create policy playback_sessions_read_scoped
on public.playback_sessions
for select
using (public.is_oniix_admin() or public.has_tenant_membership(tenant_id));

drop policy if exists playback_events_read_scoped on public.playback_events;
create policy playback_events_read_scoped
on public.playback_events
for select
using (public.is_oniix_admin() or public.has_tenant_membership(tenant_id));

drop policy if exists channel_health_read_scoped on public.channel_health;
create policy channel_health_read_scoped
on public.channel_health
for select
using (public.is_oniix_admin() or public.has_tenant_membership(tenant_id));

drop policy if exists channel_stats_minute_read_scoped on public.channel_stats_minute;
create policy channel_stats_minute_read_scoped
on public.channel_stats_minute
for select
using (public.is_oniix_admin() or public.has_tenant_membership(tenant_id));

drop policy if exists channel_realtime_presence_read_scoped on public.channel_realtime_presence;
create policy channel_realtime_presence_read_scoped
on public.channel_realtime_presence
for select
using (public.is_oniix_admin() or public.has_tenant_membership(tenant_id));

revoke insert, update, delete on public.playback_sessions from anon, authenticated;
revoke insert, update, delete on public.playback_events from anon, authenticated;
revoke insert, update, delete on public.channel_health from anon, authenticated;
revoke insert, update, delete on public.channel_stats_minute from anon, authenticated;
revoke insert, update, delete on public.channel_realtime_presence from anon, authenticated;

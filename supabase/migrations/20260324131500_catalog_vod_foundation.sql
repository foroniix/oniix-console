-- Catalog / VOD foundation for Oniix.
-- Phase 1 executable migration aligned with ADR_003_CATALOG_VOD_DOMAIN.

create extension if not exists pgcrypto;

create table if not exists public.catalog_titles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title_type text not null,
  slug text not null,
  title text not null,
  original_title text null,
  short_synopsis text null,
  long_synopsis text null,
  release_year integer null,
  maturity_rating text null,
  original_language text null,
  country_of_origin text[] not null default '{}'::text[],
  editorial_status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists catalog_titles_tenant_slug_key
  on public.catalog_titles (tenant_id, slug);

create index if not exists catalog_titles_tenant_type_idx
  on public.catalog_titles (tenant_id, title_type, updated_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_titles_type_check') then
    alter table public.catalog_titles
      add constraint catalog_titles_type_check
      check (title_type in ('movie', 'series'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_titles_status_check') then
    alter table public.catalog_titles
      add constraint catalog_titles_status_check
      check (editorial_status in ('draft', 'ready', 'published', 'archived'));
  end if;
end $$;

create table if not exists public.catalog_seasons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  series_id uuid not null references public.catalog_titles(id) on delete cascade,
  season_number integer not null,
  title text null,
  synopsis text null,
  editorial_status text not null default 'draft',
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists catalog_seasons_series_number_key
  on public.catalog_seasons (series_id, season_number);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_seasons_status_check') then
    alter table public.catalog_seasons
      add constraint catalog_seasons_status_check
      check (editorial_status in ('draft', 'ready', 'published', 'archived'));
  end if;
end $$;

create table if not exists public.catalog_episodes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  series_id uuid not null references public.catalog_titles(id) on delete cascade,
  season_id uuid null references public.catalog_seasons(id) on delete cascade,
  episode_number integer not null,
  title text not null,
  synopsis text null,
  duration_sec integer null,
  release_date date null,
  editorial_status text not null default 'draft',
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists catalog_episodes_season_episode_number_key
  on public.catalog_episodes (season_id, episode_number)
  where season_id is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_episodes_status_check') then
    alter table public.catalog_episodes
      add constraint catalog_episodes_status_check
      check (editorial_status in ('draft', 'ready', 'published', 'archived'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_episodes_duration_check') then
    alter table public.catalog_episodes
      add constraint catalog_episodes_duration_check
      check (duration_sec is null or duration_sec > 0);
  end if;
end $$;

create table if not exists public.catalog_playback_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  playable_type text not null,
  playable_id uuid not null,
  source_kind text not null,
  delivery_mode text not null default 'gateway',
  origin_url text not null,
  duration_sec integer null,
  drm jsonb not null default '{}'::jsonb,
  audio_tracks jsonb not null default '[]'::jsonb,
  subtitle_tracks jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  source_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_playback_sources_playable_idx
  on public.catalog_playback_sources (tenant_id, playable_type, playable_id, source_status);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_playback_sources_playable_type_check') then
    alter table public.catalog_playback_sources
      add constraint catalog_playback_sources_playable_type_check
      check (playable_type in ('movie', 'episode'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_playback_sources_source_kind_check') then
    alter table public.catalog_playback_sources
      add constraint catalog_playback_sources_source_kind_check
      check (source_kind in ('hls', 'dash', 'file'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_playback_sources_delivery_mode_check') then
    alter table public.catalog_playback_sources
      add constraint catalog_playback_sources_delivery_mode_check
      check (delivery_mode in ('gateway', 'direct'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_playback_sources_status_check') then
    alter table public.catalog_playback_sources
      add constraint catalog_playback_sources_status_check
      check (source_status in ('draft', 'ready', 'published', 'archived'));
  end if;
end $$;

create table if not exists public.catalog_publications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  playable_type text not null,
  playable_id uuid not null,
  visibility text not null default 'private',
  publication_status text not null default 'draft',
  available_from timestamptz null,
  available_to timestamptz null,
  geo jsonb not null default '{"allow":[],"block":[]}'::jsonb,
  storefront text not null default 'mobile-app',
  featured_rank integer null,
  published_at timestamptz null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists catalog_publications_unique_playable_storefront
  on public.catalog_publications (tenant_id, playable_type, playable_id, storefront);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_publications_playable_type_check') then
    alter table public.catalog_publications
      add constraint catalog_publications_playable_type_check
      check (playable_type in ('movie', 'series', 'season', 'episode'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_publications_visibility_check') then
    alter table public.catalog_publications
      add constraint catalog_publications_visibility_check
      check (visibility in ('private', 'public', 'unlisted'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_publications_status_check') then
    alter table public.catalog_publications
      add constraint catalog_publications_status_check
      check (publication_status in ('draft', 'scheduled', 'published', 'archived'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_publications_window_check') then
    alter table public.catalog_publications
      add constraint catalog_publications_window_check
      check (available_to is null or available_from is null or available_to > available_from);
  end if;
end $$;

create table if not exists public.catalog_partner_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  partner_code text not null,
  display_name text not null,
  source_type text not null,
  connection_status text not null default 'draft',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists catalog_partner_sources_tenant_partner_code_key
  on public.catalog_partner_sources (tenant_id, partner_code);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_partner_sources_source_type_check') then
    alter table public.catalog_partner_sources
      add constraint catalog_partner_sources_source_type_check
      check (source_type in ('csv', 'api', 'manual'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_partner_sources_status_check') then
    alter table public.catalog_partner_sources
      add constraint catalog_partner_sources_status_check
      check (connection_status in ('draft', 'ready', 'active', 'paused', 'error'));
  end if;
end $$;

create table if not exists public.catalog_ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  partner_source_id uuid not null references public.catalog_partner_sources(id) on delete cascade,
  job_type text not null,
  job_status text not null default 'queued',
  started_at timestamptz null,
  finished_at timestamptz null,
  summary jsonb not null default '{}'::jsonb,
  error_message text null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_ingest_jobs_type_check') then
    alter table public.catalog_ingest_jobs
      add constraint catalog_ingest_jobs_type_check
      check (job_type in ('full_sync', 'delta_sync', 'asset_sync', 'manual_import'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_ingest_jobs_status_check') then
    alter table public.catalog_ingest_jobs
      add constraint catalog_ingest_jobs_status_check
      check (job_status in ('queued', 'running', 'done', 'failed', 'cancelled'));
  end if;
end $$;

create table if not exists public.watch_progress (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  playable_type text not null,
  playable_id uuid not null,
  progress_sec integer not null default 0,
  duration_sec integer null,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id, playable_type, playable_id)
);

create table if not exists public.watchlist_items (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  playable_type text not null,
  playable_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id, playable_type, playable_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'watch_progress_playable_type_check') then
    alter table public.watch_progress
      add constraint watch_progress_playable_type_check
      check (playable_type in ('replay', 'movie', 'episode'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'watchlist_items_playable_type_check') then
    alter table public.watchlist_items
      add constraint watchlist_items_playable_type_check
      check (playable_type in ('movie', 'series', 'season', 'episode', 'replay'));
  end if;
end $$;

do $$
declare
  tbl text;
  tenant_tables text[] := array[
    'catalog_titles',
    'catalog_seasons',
    'catalog_episodes',
    'catalog_playback_sources',
    'catalog_publications',
    'catalog_partner_sources',
    'catalog_ingest_jobs'
  ];
begin
  foreach tbl in array tenant_tables loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists %I_read_scoped on public.%I', tbl, tbl);
    execute format(
      'create policy %I_read_scoped on public.%I for select using (public.is_oniix_admin() or public.has_tenant_membership(tenant_id))',
      tbl,
      tbl
    );
    execute format('drop policy if exists %I_write_scoped on public.%I', tbl, tbl);
    execute format(
      'create policy %I_write_scoped on public.%I for all using (public.is_oniix_admin() or public.has_tenant_membership(tenant_id)) with check (public.is_oniix_admin() or public.has_tenant_membership(tenant_id))',
      tbl,
      tbl
    );
  end loop;
end $$;

alter table public.watch_progress enable row level security;
drop policy if exists watch_progress_read_scoped on public.watch_progress;
create policy watch_progress_read_scoped
on public.watch_progress
for select
using (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
  or auth.uid() = user_id
);

drop policy if exists watch_progress_write_scoped on public.watch_progress;
create policy watch_progress_write_scoped
on public.watch_progress
for all
using (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
  or auth.uid() = user_id
)
with check (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
  or auth.uid() = user_id
);

alter table public.watchlist_items enable row level security;
drop policy if exists watchlist_items_read_scoped on public.watchlist_items;
create policy watchlist_items_read_scoped
on public.watchlist_items
for select
using (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
  or auth.uid() = user_id
);

drop policy if exists watchlist_items_write_scoped on public.watchlist_items;
create policy watchlist_items_write_scoped
on public.watchlist_items
for all
using (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
  or auth.uid() = user_id
)
with check (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
  or auth.uid() = user_id
);

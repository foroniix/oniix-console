-- Catalog / VOD foundation for Oniix.
-- Canonical target schema for a production-grade hybrid platform:
-- live TV + replay + catalog / VOD.
-- This file is versioned as architecture support and should be translated
-- into executable Supabase migrations in controlled implementation lots.

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
  on public.catalog_titles (tenant_id, title_type, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_titles_type_check'
  ) then
    alter table public.catalog_titles
      add constraint catalog_titles_type_check
      check (title_type in ('movie', 'series'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'catalog_titles_status_check'
  ) then
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

create index if not exists catalog_seasons_tenant_series_idx
  on public.catalog_seasons (tenant_id, series_id, sort_order, season_number);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_seasons_status_check'
  ) then
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

create index if not exists catalog_episodes_tenant_series_idx
  on public.catalog_episodes (tenant_id, series_id, season_id, sort_order, episode_number);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_episodes_status_check'
  ) then
    alter table public.catalog_episodes
      add constraint catalog_episodes_status_check
      check (editorial_status in ('draft', 'ready', 'published', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'catalog_episodes_duration_check'
  ) then
    alter table public.catalog_episodes
      add constraint catalog_episodes_duration_check
      check (duration_sec is null or duration_sec > 0);
  end if;
end $$;

create table if not exists public.catalog_media_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_type text not null,
  owner_id uuid not null,
  asset_type text not null,
  storage_provider text null,
  source_url text not null,
  alt_text text null,
  locale text null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_media_assets_owner_idx
  on public.catalog_media_assets (tenant_id, owner_type, owner_id, asset_type, sort_order);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_media_assets_owner_type_check'
  ) then
    alter table public.catalog_media_assets
      add constraint catalog_media_assets_owner_type_check
      check (owner_type in ('title', 'season', 'episode'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'catalog_media_assets_asset_type_check'
  ) then
    alter table public.catalog_media_assets
      add constraint catalog_media_assets_asset_type_check
      check (asset_type in ('poster', 'backdrop', 'thumbnail', 'logo', 'trailer'));
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
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_playback_sources_playable_type_check'
  ) then
    alter table public.catalog_playback_sources
      add constraint catalog_playback_sources_playable_type_check
      check (playable_type in ('movie', 'episode'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'catalog_playback_sources_source_kind_check'
  ) then
    alter table public.catalog_playback_sources
      add constraint catalog_playback_sources_source_kind_check
      check (source_kind in ('hls', 'dash', 'file'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'catalog_playback_sources_delivery_mode_check'
  ) then
    alter table public.catalog_playback_sources
      add constraint catalog_playback_sources_delivery_mode_check
      check (delivery_mode in ('gateway', 'direct'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'catalog_playback_sources_status_check'
  ) then
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
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_publications_playable_type_check'
  ) then
    alter table public.catalog_publications
      add constraint catalog_publications_playable_type_check
      check (playable_type in ('movie', 'series', 'season', 'episode'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'catalog_publications_visibility_check'
  ) then
    alter table public.catalog_publications
      add constraint catalog_publications_visibility_check
      check (visibility in ('private', 'public', 'unlisted'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'catalog_publications_status_check'
  ) then
    alter table public.catalog_publications
      add constraint catalog_publications_status_check
      check (publication_status in ('draft', 'scheduled', 'published', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'catalog_publications_window_check'
  ) then
    alter table public.catalog_publications
      add constraint catalog_publications_window_check
      check (
        available_to is null
        or available_from is null
        or available_to > available_from
      );
  end if;
end $$;

create table if not exists public.catalog_genres (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists catalog_genres_tenant_slug_key
  on public.catalog_genres (tenant_id, slug);

create table if not exists public.catalog_title_genres (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title_id uuid not null references public.catalog_titles(id) on delete cascade,
  genre_id uuid not null references public.catalog_genres(id) on delete cascade,
  primary key (title_id, genre_id)
);

create table if not exists public.catalog_people (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  slug text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_title_people (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title_id uuid not null references public.catalog_titles(id) on delete cascade,
  person_id uuid not null references public.catalog_people(id) on delete cascade,
  role_type text not null,
  billing_order integer null,
  primary key (title_id, person_id, role_type)
);

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
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_partner_sources_source_type_check'
  ) then
    alter table public.catalog_partner_sources
      add constraint catalog_partner_sources_source_type_check
      check (source_type in ('csv', 'api', 'manual'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'catalog_partner_sources_status_check'
  ) then
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
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_ingest_jobs_type_check'
  ) then
    alter table public.catalog_ingest_jobs
      add constraint catalog_ingest_jobs_type_check
      check (job_type in ('full_sync', 'delta_sync', 'asset_sync', 'manual_import'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'catalog_ingest_jobs_status_check'
  ) then
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

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'watch_progress_playable_type_check'
  ) then
    alter table public.watch_progress
      add constraint watch_progress_playable_type_check
      check (playable_type in ('replay', 'movie', 'episode'));
  end if;
end $$;

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
  if not exists (
    select 1 from pg_constraint where conname = 'watchlist_items_playable_type_check'
  ) then
    alter table public.watchlist_items
      add constraint watchlist_items_playable_type_check
      check (playable_type in ('movie', 'series', 'season', 'episode', 'replay'));
  end if;
end $$;

-- RLS target rules: reuse the tenancy model already retained by Oniix.
alter table public.catalog_titles enable row level security;
alter table public.catalog_seasons enable row level security;
alter table public.catalog_episodes enable row level security;
alter table public.catalog_media_assets enable row level security;
alter table public.catalog_playback_sources enable row level security;
alter table public.catalog_publications enable row level security;
alter table public.catalog_genres enable row level security;
alter table public.catalog_title_genres enable row level security;
alter table public.catalog_people enable row level security;
alter table public.catalog_title_people enable row level security;
alter table public.catalog_partner_sources enable row level security;
alter table public.catalog_ingest_jobs enable row level security;
alter table public.watch_progress enable row level security;
alter table public.watchlist_items enable row level security;

-- Implementation note:
-- The executable migration should align policies with:
-- public.is_oniix_admin()
-- public.has_tenant_membership(tenant_id)
-- public.is_tenant_admin(tenant_id)
-- and the application-level capabilities retained in tenant-roles.ts.


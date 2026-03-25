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

alter table public.catalog_media_assets enable row level security;

drop policy if exists catalog_media_assets_read_scoped on public.catalog_media_assets;
create policy catalog_media_assets_read_scoped
on public.catalog_media_assets
for select
using (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
);

drop policy if exists catalog_media_assets_write_scoped on public.catalog_media_assets;
create policy catalog_media_assets_write_scoped
on public.catalog_media_assets
for all
using (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
)
with check (
  public.is_oniix_admin()
  or public.has_tenant_membership(tenant_id)
);

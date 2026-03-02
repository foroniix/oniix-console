-- Per-tenant ingest keys for mobile/edge analytics ingestion.
-- The API stores only a hash of the key.

create table if not exists public.tenant_ingest_keys (
  tenant_id uuid primary key,
  key_hash text not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now(),
  rotated_by uuid null
);

alter table public.tenant_ingest_keys enable row level security;

-- Tenant members can read their own tenant key metadata.
drop policy if exists tenant_ingest_keys_read_self
on public.tenant_ingest_keys;

create policy tenant_ingest_keys_read_self
on public.tenant_ingest_keys
for select
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = tenant_ingest_keys.tenant_id
      and tm.user_id = auth.uid()
  )
);

-- Tenant members can insert/update only their own tenant key.
drop policy if exists tenant_ingest_keys_write_self
on public.tenant_ingest_keys;

create policy tenant_ingest_keys_write_self
on public.tenant_ingest_keys
for insert
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = tenant_ingest_keys.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists tenant_ingest_keys_update_self
on public.tenant_ingest_keys;

create policy tenant_ingest_keys_update_self
on public.tenant_ingest_keys
for update
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = tenant_ingest_keys.tenant_id
      and tm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = tenant_ingest_keys.tenant_id
      and tm.user_id = auth.uid()
  )
);

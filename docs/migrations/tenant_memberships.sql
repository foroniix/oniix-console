-- Reference migration for tenant membership.
-- Adjust foreign keys to your schema if needed.

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;

create table if not exists public.tenant_memberships (
  tenant_id uuid not null,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

alter table public.tenant_memberships enable row level security;

-- Members can read their own membership for the current tenant
create policy if not exists tenant_memberships_read_self
on public.tenant_memberships
for select
using (
  user_id = auth.uid()
  and tenant_id = public.current_tenant_id()
);

-- Allow users to create their own membership for the current tenant
create policy if not exists tenant_memberships_insert_self
on public.tenant_memberships
for insert
with check (
  user_id = auth.uid()
  and tenant_id = public.current_tenant_id()
);

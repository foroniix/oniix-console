-- Audit log table for tenant-scoped activity tracking.

create extension if not exists "pgcrypto";

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  actor_user_id uuid not null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_tenant_created_at_idx
  on public.audit_logs (tenant_id, created_at desc);

create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_user_id);

alter table public.audit_logs enable row level security;

-- Read logs only for the current tenant and current member.
create policy if not exists audit_logs_read_tenant
on public.audit_logs
for select
using (
  tenant_id = public.current_tenant_id()
  and exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = public.audit_logs.tenant_id
      and tm.user_id = auth.uid()
  )
);

-- Insert logs only for the current tenant and current actor.
create policy if not exists audit_logs_insert_actor
on public.audit_logs
for insert
with check (
  tenant_id = public.current_tenant_id()
  and actor_user_id = auth.uid()
  and exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = public.audit_logs.tenant_id
      and tm.user_id = auth.uid()
  )
);

create extension if not exists pgcrypto;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid null references public.tenants(id) on delete cascade,
  kind text not null,
  severity text not null default 'info',
  title text not null,
  body text not null,
  action_label text null,
  action_url text null,
  dedupe_key text null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_notifications
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists kind text,
  add column if not exists severity text not null default 'info',
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists action_label text null,
  add column if not exists action_url text null,
  add column if not exists dedupe_key text null,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists is_read boolean not null default false,
  add column if not exists read_at timestamptz null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_notifications_severity_check'
  ) then
    alter table public.user_notifications
      add constraint user_notifications_severity_check
      check (severity in ('info', 'success', 'warning', 'critical'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_notifications_user_dedupe_key_key'
  ) then
    alter table public.user_notifications
      add constraint user_notifications_user_dedupe_key_key
      unique (user_id, dedupe_key);
  end if;
end $$;

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id, is_read, created_at desc);

create index if not exists user_notifications_tenant_created_idx
  on public.user_notifications (tenant_id, created_at desc);

drop trigger if exists set_user_notifications_updated_at on public.user_notifications;
create trigger set_user_notifications_updated_at
before update on public.user_notifications
for each row execute function public.set_updated_at();

alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_read_own on public.user_notifications;
create policy user_notifications_read_own
on public.user_notifications
for select
using (auth.uid() = user_id or public.is_oniix_admin());

drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own
on public.user_notifications
for update
using (auth.uid() = user_id or public.is_oniix_admin())
with check (auth.uid() = user_id or public.is_oniix_admin());

revoke insert, delete on public.user_notifications from anon, authenticated;
grant select, update on public.user_notifications to authenticated;

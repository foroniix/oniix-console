-- Operator / sponsorship foundation for telco pilots.
-- Initial target partner: Celtiis Benin.

create extension if not exists pgcrypto;

create table if not exists public.operator_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  home_country_iso2 text null,
  integration_mode text not null default 'manual_whitelist',
  active boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operator_accounts
  add column if not exists code text,
  add column if not exists name text,
  add column if not exists home_country_iso2 text null,
  add column if not exists integration_mode text not null default 'manual_whitelist',
  add column if not exists active boolean not null default true,
  add column if not exists notes text null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.operator_accounts
set active = true
where active is null;

update public.operator_accounts
set integration_mode = 'manual_whitelist'
where integration_mode is null or btrim(integration_mode) = '';

alter table public.operator_accounts
  alter column active set default true,
  alter column integration_mode set default 'manual_whitelist';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'operator_accounts_integration_mode_check'
  ) then
    alter table public.operator_accounts
      add constraint operator_accounts_integration_mode_check
      check (integration_mode in ('manual_whitelist', 'direct_api', 'open_gateway'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'operator_accounts_home_country_iso2_check'
  ) then
    alter table public.operator_accounts
      add constraint operator_accounts_home_country_iso2_check
      check (home_country_iso2 is null or char_length(home_country_iso2) = 2);
  end if;
end $$;

create unique index if not exists operator_accounts_code_key
  on public.operator_accounts (code);

drop trigger if exists set_operator_accounts_updated_at on public.operator_accounts;
create trigger set_operator_accounts_updated_at
before update on public.operator_accounts
for each row execute function public.set_updated_at();

create table if not exists public.operator_offers (
  id uuid primary key default gen_random_uuid(),
  operator_account_id uuid not null references public.operator_accounts(id) on delete cascade,
  code text not null,
  name text not null,
  sponsorship_enabled boolean not null default true,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operator_offers
  add column if not exists operator_account_id uuid references public.operator_accounts(id) on delete cascade,
  add column if not exists code text,
  add column if not exists name text,
  add column if not exists sponsorship_enabled boolean not null default true,
  add column if not exists active boolean not null default true,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.operator_offers
set sponsorship_enabled = true
where sponsorship_enabled is null;

update public.operator_offers
set active = true
where active is null;

update public.operator_offers
set metadata = '{}'::jsonb
where metadata is null;

alter table public.operator_offers
  alter column sponsorship_enabled set default true,
  alter column active set default true,
  alter column metadata set default '{}'::jsonb;

create unique index if not exists operator_offers_operator_account_id_code_key
  on public.operator_offers (operator_account_id, code);

create index if not exists operator_offers_operator_account_id_idx
  on public.operator_offers (operator_account_id);

drop trigger if exists set_operator_offers_updated_at on public.operator_offers;
create trigger set_operator_offers_updated_at
before update on public.operator_offers
for each row execute function public.set_updated_at();

create table if not exists public.sponsorship_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  operator_account_id uuid not null references public.operator_accounts(id) on delete cascade,
  operator_offer_id uuid null references public.operator_offers(id) on delete set null,
  channel_id uuid null references public.channels(id) on delete cascade,
  stream_id uuid null references public.streams(id) on delete set null,
  active boolean not null default true,
  pilot_scoped boolean not null default true,
  decision_mode text not null default 'sponsored',
  allowed_country_iso2 text null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sponsorship_policies
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists operator_account_id uuid references public.operator_accounts(id) on delete cascade,
  add column if not exists operator_offer_id uuid null references public.operator_offers(id) on delete set null,
  add column if not exists channel_id uuid null references public.channels(id) on delete cascade,
  add column if not exists stream_id uuid null references public.streams(id) on delete set null,
  add column if not exists active boolean not null default true,
  add column if not exists pilot_scoped boolean not null default true,
  add column if not exists decision_mode text not null default 'sponsored',
  add column if not exists allowed_country_iso2 text null,
  add column if not exists starts_at timestamptz null,
  add column if not exists ends_at timestamptz null,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.sponsorship_policies
set active = true
where active is null;

update public.sponsorship_policies
set pilot_scoped = true
where pilot_scoped is null;

update public.sponsorship_policies
set decision_mode = 'sponsored'
where decision_mode is null or btrim(decision_mode) = '';

update public.sponsorship_policies
set metadata = '{}'::jsonb
where metadata is null;

alter table public.sponsorship_policies
  alter column active set default true,
  alter column pilot_scoped set default true,
  alter column decision_mode set default 'sponsored',
  alter column metadata set default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sponsorship_policies_decision_mode_check'
  ) then
    alter table public.sponsorship_policies
      add constraint sponsorship_policies_decision_mode_check
      check (decision_mode in ('sponsored', 'partner_bypass'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sponsorship_policies_country_iso2_check'
  ) then
    alter table public.sponsorship_policies
      add constraint sponsorship_policies_country_iso2_check
      check (allowed_country_iso2 is null or char_length(allowed_country_iso2) = 2);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sponsorship_policies_end_after_start_check'
  ) then
    alter table public.sponsorship_policies
      add constraint sponsorship_policies_end_after_start_check
      check (ends_at is null or starts_at is null or ends_at >= starts_at);
  end if;
end $$;

create index if not exists sponsorship_policies_tenant_id_idx
  on public.sponsorship_policies (tenant_id);

create index if not exists sponsorship_policies_operator_account_id_idx
  on public.sponsorship_policies (operator_account_id);

create index if not exists sponsorship_policies_tenant_channel_idx
  on public.sponsorship_policies (tenant_id, channel_id, active);

create index if not exists sponsorship_policies_tenant_stream_idx
  on public.sponsorship_policies (tenant_id, stream_id, active);

drop trigger if exists set_sponsorship_policies_updated_at on public.sponsorship_policies;
create trigger set_sponsorship_policies_updated_at
before update on public.sponsorship_policies
for each row execute function public.set_updated_at();

alter table public.playback_sessions
  add column if not exists operator_account_id uuid null references public.operator_accounts(id) on delete set null,
  add column if not exists operator_offer_id uuid null references public.operator_offers(id) on delete set null,
  add column if not exists sponsorship_policy_id uuid null references public.sponsorship_policies(id) on delete set null,
  add column if not exists sponsorship_status text null,
  add column if not exists sponsorship_reason text null,
  add column if not exists operator_correlation_id text null,
  add column if not exists operator_code text null,
  add column if not exists operator_name_snapshot text null,
  add column if not exists operator_offer_code text null;

update public.playback_sessions
set sponsorship_status = 'not_eligible'
where sponsorship_status is null or btrim(sponsorship_status) = '';

alter table public.playback_sessions
  alter column sponsorship_status set default 'not_eligible';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'playback_sessions_sponsorship_status_check'
  ) then
    alter table public.playback_sessions
      add constraint playback_sessions_sponsorship_status_check
      check (sponsorship_status in ('not_eligible', 'sponsored', 'partner_bypass', 'operator_unavailable'));
  end if;
end $$;

create index if not exists playback_sessions_operator_account_id_idx
  on public.playback_sessions (operator_account_id);

create index if not exists playback_sessions_sponsorship_status_idx
  on public.playback_sessions (tenant_id, sponsorship_status, started_at desc);

alter table public.operator_accounts enable row level security;
alter table public.operator_offers enable row level security;
alter table public.sponsorship_policies enable row level security;

drop policy if exists operator_accounts_read_admin on public.operator_accounts;
create policy operator_accounts_read_admin
on public.operator_accounts
for select
using (public.is_oniix_admin());

drop policy if exists operator_accounts_write_admin on public.operator_accounts;
create policy operator_accounts_write_admin
on public.operator_accounts
for all
using (public.is_oniix_admin())
with check (public.is_oniix_admin());

drop policy if exists operator_offers_read_admin on public.operator_offers;
create policy operator_offers_read_admin
on public.operator_offers
for select
using (public.is_oniix_admin());

drop policy if exists operator_offers_write_admin on public.operator_offers;
create policy operator_offers_write_admin
on public.operator_offers
for all
using (public.is_oniix_admin())
with check (public.is_oniix_admin());

drop policy if exists sponsorship_policies_read_scoped on public.sponsorship_policies;
create policy sponsorship_policies_read_scoped
on public.sponsorship_policies
for select
using (public.is_oniix_admin() or public.has_tenant_membership(tenant_id));

drop policy if exists sponsorship_policies_write_scoped on public.sponsorship_policies;
create policy sponsorship_policies_write_scoped
on public.sponsorship_policies
for all
using (public.is_oniix_admin() or public.is_tenant_admin(tenant_id))
with check (public.is_oniix_admin() or public.is_tenant_admin(tenant_id));

insert into public.operator_accounts (
  code,
  name,
  home_country_iso2,
  integration_mode,
  active,
  notes
)
values (
  'celtiis-bj',
  'Celtiis Benin',
  'BJ',
  'manual_whitelist',
  true,
  'Seed operator account for the first Oniix telecom pilot.'
)
on conflict (code) do update
set
  name = excluded.name,
  home_country_iso2 = excluded.home_country_iso2,
  integration_mode = excluded.integration_mode,
  active = excluded.active,
  notes = excluded.notes;

insert into public.operator_offers (
  operator_account_id,
  code,
  name,
  sponsorship_enabled,
  active,
  metadata
)
select
  oa.id,
  'pilot-tv-sponsored',
  'Pilot TV sponsorise',
  true,
  true,
  '{"scope":"pilot","partner":"Celtiis Benin"}'::jsonb
from public.operator_accounts oa
where oa.code = 'celtiis-bj'
on conflict (operator_account_id, code) do update
set
  name = excluded.name,
  sponsorship_enabled = excluded.sponsorship_enabled,
  active = excluded.active,
  metadata = excluded.metadata;

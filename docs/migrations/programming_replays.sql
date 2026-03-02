-- Programs, slots ("A suivre"), and HLS replay catalog for tenant editors.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  channel_id uuid null,
  title text not null,
  synopsis text null,
  category text null,
  poster text null,
  tags text[] not null default '{}'::text[],
  status text not null default 'draft',
  published_at timestamptz null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_programs_tenant_created_at
  on public.programs (tenant_id, created_at desc);

create index if not exists idx_programs_tenant_status
  on public.programs (tenant_id, status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'programs_status_check'
  ) then
    alter table public.programs
      add constraint programs_status_check
      check (status in ('draft', 'scheduled', 'published', 'cancelled'));
  end if;
end $$;

create table if not exists public.program_slots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  program_id uuid not null references public.programs(id) on delete cascade,
  channel_id uuid null,
  starts_at timestamptz not null,
  ends_at timestamptz null,
  slot_status text not null default 'scheduled',
  visibility text not null default 'public',
  notes text null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_program_slots_tenant_starts_at
  on public.program_slots (tenant_id, starts_at asc);

create index if not exists idx_program_slots_tenant_status
  on public.program_slots (tenant_id, slot_status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'program_slots_status_check'
  ) then
    alter table public.program_slots
      add constraint program_slots_status_check
      check (slot_status in ('scheduled', 'published', 'cancelled'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'program_slots_visibility_check'
  ) then
    alter table public.program_slots
      add constraint program_slots_visibility_check
      check (visibility in ('public', 'private'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'program_slots_time_check'
  ) then
    alter table public.program_slots
      add constraint program_slots_time_check
      check (ends_at is null or ends_at > starts_at);
  end if;
end $$;

-- Existing table may already exist with minimal columns.
create table if not exists public.replays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  stream_id uuid null,
  channel_id uuid null,
  title text,
  synopsis text null,
  hls_url text null,
  poster text null,
  duration_sec integer null,
  replay_status text not null default 'draft',
  available_from timestamptz null,
  available_to timestamptz null,
  geo jsonb not null default '{"allow":[],"block":[]}'::jsonb,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.replays add column if not exists channel_id uuid null;
alter table public.replays add column if not exists synopsis text null;
alter table public.replays add column if not exists hls_url text null;
alter table public.replays add column if not exists poster text null;
alter table public.replays add column if not exists duration_sec integer null;
alter table public.replays add column if not exists replay_status text not null default 'draft';
alter table public.replays add column if not exists available_from timestamptz null;
alter table public.replays add column if not exists available_to timestamptz null;
alter table public.replays add column if not exists geo jsonb not null default '{"allow":[],"block":[]}'::jsonb;
alter table public.replays add column if not exists created_by uuid null;
alter table public.replays add column if not exists updated_by uuid null;
alter table public.replays add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_replays_tenant_created_at
  on public.replays (tenant_id, created_at desc);

create index if not exists idx_replays_tenant_status
  on public.replays (tenant_id, replay_status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'replays_status_check'
  ) then
    alter table public.replays
      add constraint replays_status_check
      check (replay_status in ('draft', 'ready', 'published', 'archived'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'replays_window_check'
  ) then
    alter table public.replays
      add constraint replays_window_check
      check (
        available_to is null
        or available_from is null
        or available_to > available_from
      );
  end if;
end $$;

alter table public.programs enable row level security;
alter table public.program_slots enable row level security;
alter table public.replays enable row level security;

drop policy if exists programs_select_self on public.programs;
create policy programs_select_self
on public.programs
for select
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = programs.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists programs_insert_self on public.programs;
create policy programs_insert_self
on public.programs
for insert
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = programs.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists programs_update_self on public.programs;
create policy programs_update_self
on public.programs
for update
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = programs.tenant_id
      and tm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = programs.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists programs_delete_self on public.programs;
create policy programs_delete_self
on public.programs
for delete
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = programs.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists program_slots_select_self on public.program_slots;
create policy program_slots_select_self
on public.program_slots
for select
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = program_slots.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists program_slots_insert_self on public.program_slots;
create policy program_slots_insert_self
on public.program_slots
for insert
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = program_slots.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists program_slots_update_self on public.program_slots;
create policy program_slots_update_self
on public.program_slots
for update
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = program_slots.tenant_id
      and tm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = program_slots.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists program_slots_delete_self on public.program_slots;
create policy program_slots_delete_self
on public.program_slots
for delete
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = program_slots.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists replays_select_self on public.replays;
create policy replays_select_self
on public.replays
for select
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = replays.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists replays_insert_self on public.replays;
create policy replays_insert_self
on public.replays
for insert
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = replays.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists replays_update_self on public.replays;
create policy replays_update_self
on public.replays
for update
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = replays.tenant_id
      and tm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = replays.tenant_id
      and tm.user_id = auth.uid()
  )
);

drop policy if exists replays_delete_self on public.replays;
create policy replays_delete_self
on public.replays
for delete
using (
  exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = replays.tenant_id
      and tm.user_id = auth.uid()
  )
);


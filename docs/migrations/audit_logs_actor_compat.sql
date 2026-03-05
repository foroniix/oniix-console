-- Backward-compatible audit actor column alignment.
-- Safe to run multiple times.

alter table public.audit_logs
  add column if not exists actor_user_id uuid null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'actor_id'
  ) then
    execute '
      update public.audit_logs
      set actor_user_id = coalesce(actor_user_id, actor_id)
      where actor_user_id is null
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'user_id'
  ) then
    execute '
      update public.audit_logs
      set actor_user_id = coalesce(actor_user_id, user_id)
      where actor_user_id is null
    ';
  end if;
end $$;

create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_user_id);

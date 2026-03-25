do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'playback_sessions_platform_check'
      and conrelid = 'public.playback_sessions'::regclass
  ) then
    alter table public.playback_sessions
      drop constraint playback_sessions_platform_check;
  end if;

  alter table public.playback_sessions
    add constraint playback_sessions_platform_check
    check (platform in ('ios', 'android', 'web'));
end $$;

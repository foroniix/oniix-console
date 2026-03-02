-- Manual diagnostic script for analytics pipeline.
-- Run in Supabase SQL Editor (do not treat as an automatic migration).
--
-- 1) Replace tenant_id below.
-- 2) Optional: set channel_id to filter a specific TV channel.

with params as (
  select
    'REPLACE_TENANT_ID'::text as tenant_id,
    null::text as channel_id
)
select * from params;

-- 1) Sanity: required tables exist
select to_regclass('public.analytics_events') as analytics_events_table;
select to_regclass('public.tenant_ingest_keys') as tenant_ingest_keys_table;
select to_regclass('public.viewer_sessions_live') as viewer_sessions_live_table;

-- 2) Tenant ingest key state (if empty: ingest auth likely not configured for this tenant)
with params as (
  select 'REPLACE_TENANT_ID'::text as tenant_id
)
select
  tik.tenant_id,
  tik.created_at,
  tik.rotated_at,
  length(coalesce(tik.key_hash, '')) > 0 as has_key_hash
from public.tenant_ingest_keys tik
join params p on tik.tenant_id::text = p.tenant_id
limit 1;

-- 3) Events volume (24h + 15m)
with params as (
  select 'REPLACE_TENANT_ID'::text as tenant_id
)
select
  count(*) filter (where e.created_at >= now() - interval '24 hours') as events_24h,
  count(*) filter (where e.created_at >= now() - interval '15 minutes') as events_15m,
  min(e.created_at) as first_event_at,
  max(e.created_at) as last_event_at
from public.analytics_events e
join params p on e.tenant_id::text = p.tenant_id;

-- 4) Top streams/channels by events (optional channel filter via params.channel_id)
with params as (
  select
    'REPLACE_TENANT_ID'::text as tenant_id,
    null::text as channel_id
)
select
  coalesce(c.name, 'Unknown channel') as channel_name,
  s.channel_id,
  e.stream_id,
  count(*) as events_count,
  max(e.created_at) as last_event_at
from public.analytics_events e
left join public.streams s
  on s.id::text = e.stream_id::text
  and s.tenant_id = e.tenant_id
left join public.channels c
  on c.id = s.channel_id
  and c.tenant_id = s.tenant_id
join params p
  on e.tenant_id::text = p.tenant_id
where
  e.created_at >= now() - interval '24 hours'
  and (
    p.channel_id is null
    or s.channel_id::text = p.channel_id
  )
group by c.name, s.channel_id, e.stream_id
order by events_count desc, last_event_at desc
limit 30;

-- 5) Live sessions (35s window) from viewer_sessions_live
with params as (
  select
    'REPLACE_TENANT_ID'::text as tenant_id,
    null::text as channel_id
)
select
  count(*) as active_sessions_35s,
  count(distinct v.stream_id) as active_streams_35s,
  max(v.last_seen_at) as last_seen_at
from public.viewer_sessions_live v
left join public.streams s
  on s.id::text = v.stream_id::text
  and s.tenant_id = v.tenant_id
join params p
  on v.tenant_id::text = p.tenant_id
where
  v.is_active = true
  and v.last_seen_at >= now() - interval '35 seconds'
  and (
    p.channel_id is null
    or s.channel_id::text = p.channel_id
  );

-- 6) Last raw events (quick payload sanity check)
with params as (
  select
    'REPLACE_TENANT_ID'::text as tenant_id,
    null::text as channel_id
)
select
  e.created_at,
  e.event_type,
  e.session_id,
  e.stream_id,
  e.device_type,
  s.channel_id
from public.analytics_events e
left join public.streams s
  on s.id::text = e.stream_id::text
  and s.tenant_id = e.tenant_id
join params p
  on e.tenant_id::text = p.tenant_id
where
  (
    p.channel_id is null
    or s.channel_id::text = p.channel_id
  )
order by e.created_at desc
limit 50;

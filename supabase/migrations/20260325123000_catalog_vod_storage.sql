-- Private Supabase Storage bucket for catalog / VOD source uploads.
-- Uploads are brokered by the server with signed upload URLs.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'catalog-vod-sources',
  'catalog-vod-sources',
  false,
  10737418240,
  array[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-matroska',
    'application/octet-stream'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

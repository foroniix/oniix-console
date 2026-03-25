-- Public Supabase Storage bucket for catalog posters, thumbnails and backdrops.
-- Uploads are brokered by the server with signed upload URLs.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'catalog-vod-media',
  'catalog-vod-media',
  true,
  20971520,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/avif',
    'image/svg+xml'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Community attachments are shown to every web visitor via server-signed
-- URLs; grant signed-in app users read on the bucket so the mobile client
-- can create its own signed URLs (the app has no service key).
-- Applied to production 2026-09-06 via MCP (mobile_community_uploads_read).
create policy "read community uploads"
  on storage.objects for select to authenticated
  using (bucket_id = 'community-uploads');

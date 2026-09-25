-- Scope the community-uploads read policy to the uploader's own folder.
--
-- 20260906_mobile_community_uploads_read.sql granted `authenticated` SELECT
-- on the WHOLE bucket so the mobile app could sign its own URLs. Storage
-- SELECT is also LIST: any signed-in user could enumerate every object in the
-- bucket, including attachments of removed and moderated posts, and republish
-- them by path — the posts route accepted any path string at the time (code
-- review 2026-09-25, §2 Community).
--
-- Object paths are `<uploader uuid>/<ms>-<hex>.<ext>` (lib/community/uploads.ts),
-- so the first folder is the owner. A user may read — and list — only that.
--
-- Web readers are unaffected: the post page signs attachment URLs with the
-- service role (signCommunityFileUrl), which bypasses RLS. A mobile client
-- that used to sign other users' attachments itself must fetch the signed
-- URLs from the API instead; the attachments it uploaded remain readable.
--
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "read community uploads" ON storage.objects;
DROP POLICY IF EXISTS "read own community uploads" ON storage.objects;

CREATE POLICY "read own community uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'community-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- No client INSERT/UPDATE/DELETE policy on purpose: every write goes through
-- /api/community/upload with the service role, after the mime and magic
-- bytes have been checked.

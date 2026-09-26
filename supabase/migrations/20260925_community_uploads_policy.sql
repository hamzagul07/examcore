-- Narrow the community-uploads read policy to what a reader can already see.
--
-- 20260906_mobile_community_uploads_read.sql granted `authenticated` SELECT on
-- the WHOLE bucket so the mobile app could sign attachment URLs itself.
-- Storage SELECT is also LIST, so any signed-in user could enumerate every
-- object in the bucket — including attachments of removed and moderated posts —
-- and republish them by path, because the posts route accepted any path string
-- at the time (code review 2026-09-25, §2 Community).
--
-- The first fix proposed here scoped reads to the uploader's own folder. That
-- closes the hole but breaks the mobile app, which signs OTHER users'
-- attachments when it renders a thread. So the policy grants exactly the set a
-- reader is entitled to anyway:
--   * objects in their own folder (paths are `<uploader uuid>/<ms>-<hex>.<ext>`,
--     lib/community/uploads.ts), and
--   * objects attached to a post or note that is currently `published`.
-- Anything attached only to removed, flagged or needs_edit content — and any
-- orphan upload — drops out of both reads and listings the moment its content
-- is moderated. The web app is unaffected: it signs URLs with the service role.
--
-- The EXISTS subqueries run as the caller, under the community tables' own RLS,
-- which already exposes published content. The partial GIN indexes keep each
-- check an index probe rather than a scan.
--
-- Idempotent: safe to re-run.

CREATE INDEX IF NOT EXISTS community_posts_published_attachments_gin
  ON public.community_posts USING gin (attachments jsonb_path_ops)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS community_notes_published_image_paths_gin
  ON public.community_notes USING gin (image_paths)
  WHERE status = 'published';

DROP POLICY IF EXISTS "read community uploads" ON storage.objects;
DROP POLICY IF EXISTS "read own community uploads" ON storage.objects;
DROP POLICY IF EXISTS "read visible community uploads" ON storage.objects;

CREATE POLICY "read visible community uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'community-uploads'
    AND (
      (storage.foldername(objects.name))[1] = (SELECT auth.uid())::text
      OR EXISTS (
        SELECT 1 FROM public.community_posts p
         WHERE p.status = 'published'
           AND p.attachments @> jsonb_build_array(jsonb_build_object('path', objects.name))
      )
      OR EXISTS (
        SELECT 1 FROM public.community_notes n
         WHERE n.status = 'published'
           AND objects.name = ANY (n.image_paths)
      )
    )
  );

-- No client INSERT/UPDATE/DELETE policy on purpose: every write goes through
-- /api/community/upload with the service role, after the mime and magic bytes
-- have been checked.

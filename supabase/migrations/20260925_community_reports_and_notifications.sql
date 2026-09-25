-- Report abuse controls and the notification actor column behind them.
--
-- Code review 2026-09-25, §2 Community:
--   * "Two reports auto-hide anything" — FLAG_THRESHOLD was 2 with no
--     reporter-quality gate and no per-user cap, so two throwaway accounts
--     could suppress any content instantly. The application now requires
--     three DISTINCT established reporters (lib/community/report-policy.ts)
--     and caps each account at ten reports a day, counted straight off this
--     table; the index below makes that count a range scan.
--   * "Mention spam" — the email cooldown was keyed on href, which for a
--     comment carries `#comment-<id>` and so never repeated. The cooldown is
--     now keyed on (recipient, sender), which needs the sender on the row.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- notifications.actor_id — who caused the notification (null for system
-- notices such as digests and moderation). `body` is re-declared for a
-- preview database built by replay: production has it (the mobile reaction
-- trigger writes it) but no migration in this directory added it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- The per-sender cooldown asks "did THIS actor mention THIS user in the last
-- hour?"; the moderation notice asks "did we already tell this user about
-- THIS target?" (keyed on body). Both are lookups on (user_id, type, ...).
CREATE INDEX IF NOT EXISTS idx_notifications_user_actor_type
  ON public.notifications (user_id, actor_id, type, created_at DESC)
  WHERE actor_id IS NOT NULL;

COMMENT ON COLUMN public.notifications.actor_id IS
  'User whose action produced this notification (voter, commenter, mentioner). Null for system notices. Keys the per-sender mention email cooldown.';

-- Clients may read their own notifications; the new column carries no new
-- information (the title already names the actor), so no policy change.

-- ---------------------------------------------------------------------------
-- community_reports — the per-reporter daily count.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_community_reports_reporter_day
  ON public.community_reports (reporter_id, created_at DESC)
  WHERE reporter_id IS NOT NULL;

-- The auto-flag helper is service-role only and no longer called by the web
-- app (the route applies the reporter-quality rules in code), but a caller
-- that still reaches for it should not be able to hide content at two.
CREATE OR REPLACE FUNCTION public.community_auto_flag_target(
  p_target_type text,
  p_target_id uuid,
  p_threshold int DEFAULT 3
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  -- Distinct reporters, not rows: the unique index
  -- uq_community_reports_reporter_target makes these the same thing for
  -- signed-in reporters, but a null reporter_id (deleted account) must not
  -- count more than once either.
  SELECT count(DISTINCT reporter_id) INTO v_count
    FROM public.community_reports
   WHERE target_type = p_target_type
     AND target_id = p_target_id
     AND status = 'open'
     AND reporter_id IS NOT NULL;
  IF v_count < greatest(coalesce(p_threshold, 3), 3) THEN
    RETURN;
  END IF;

  IF p_target_type = 'note' THEN
    UPDATE public.community_notes SET status = 'flagged' WHERE id = p_target_id AND status = 'published';
  ELSIF p_target_type = 'question' THEN
    UPDATE public.community_questions SET status = 'flagged' WHERE id = p_target_id AND status = 'published';
  ELSIF p_target_type = 'answer' THEN
    UPDATE public.community_answers SET status = 'flagged' WHERE id = p_target_id AND status = 'published';
  ELSIF p_target_type = 'post' THEN
    UPDATE public.community_posts SET status = 'flagged' WHERE id = p_target_id AND status = 'published';
  ELSIF p_target_type = 'comment' THEN
    UPDATE public.community_comments SET status = 'flagged' WHERE id = p_target_id AND status = 'published';
  END IF;
END;
$$;

-- Re-assert the lockdown from 20260704_lock_community_definer_rpcs.sql:
-- CREATE OR REPLACE keeps existing grants, but a fresh database built by
-- replay must end in the same state.
REVOKE ALL ON FUNCTION public.community_auto_flag_target(text, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.community_auto_flag_target(text, uuid, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_auto_flag_target(text, uuid, integer) TO service_role;

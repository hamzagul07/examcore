-- SECURITY FIX for 20260722_mark_feedback.sql.
--
-- The original RLS policies checked only `auth.uid() = user_id`, leaving every
-- other column unconstrained. Combined with Supabase's default table-wide
-- INSERT grant to `authenticated`, any signed-in user could POST straight to
-- PostgREST with `share_consent: true` and `approved_at: <now>` and publish
-- arbitrary text as an approved testimonial on the public homepage — bypassing
-- the API route's ownership check and its `approved_at: null` reset entirely.
-- No attempt ownership was involved, and `attempt_id` NULL is distinct under
-- the unique index, so it was unbounded.
--
-- Every legitimate write already goes through /api/mark/feedback using the
-- service role, which bypasses both grants and RLS. So the fix is simply to
-- stop granting write access to end-user roles at all: the policies below
-- become unreachable belt-and-braces rather than the only line of defence.

revoke insert, update, delete on public.mark_feedback from anon, authenticated;

-- Drop the now-redundant policies. Leaving them would imply user-role writes
-- are supported and invite someone to re-grant the privilege later.
drop policy if exists "insert own mark feedback" on public.mark_feedback;
drop policy if exists "update own mark feedback" on public.mark_feedback;

comment on table public.mark_feedback is
  'Post-mark "was this fair?" verdicts. Doubles as the marking-accuracy signal and the (opt-in, separately approved) testimonial source. WRITES ARE SERVICE-ROLE ONLY — see /api/mark/feedback. approved_at must never be settable by an end user.';

-- The stats views are `security_invoker`, so they already return zero rows to
-- anon/authenticated (the base tables grant them no SELECT). Revoking makes
-- that deliberate instead of a side effect of the base-table grants.
revoke select on public.mark_feedback_daily_stats from anon, authenticated;
revoke select on public.mark_run_daily_stats from anon, authenticated;

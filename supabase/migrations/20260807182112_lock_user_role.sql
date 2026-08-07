-- Make `user_profiles.role` server-controlled.
--
-- `requireTeacher()` gates every /teacher route and API on this column, but
-- `authenticated` held UPDATE on it and the RLS policy checks only
-- `auth.uid() = id` — not which columns changed. So any signed-in user could
-- PATCH themselves to 'teacher' and the check was a UI preference, not an
-- authorisation boundary.
--
-- The grant is removed rather than the flow: teachers still choose "I'm a
-- teacher" during onboarding, which matters for the outreach campaign — a
-- teacher who lands from a cold email must be able to set themselves up without
-- waiting on anyone. That write now goes through the onboarding server action's
-- service client, which has already verified the user id server-side.
--
-- Note this is not what gates the teacher *allowance*: that hangs off
-- `teacher_verified_at` (20260807_teacher_seats.sql) and is granted by hand.
-- Locking `role` closes the remaining hole, which is read access to the teacher
-- UI and the ability to create classrooms.

revoke update (role) on public.user_profiles from anon, authenticated;
revoke insert (role) on public.user_profiles from anon, authenticated;

comment on column public.user_profiles.role is
  'Which teacher/student UI to show. Service-role writes only — see lib/onboarding/save-profile.ts. Does NOT grant the teacher allowance; that is teacher_verified_at.';

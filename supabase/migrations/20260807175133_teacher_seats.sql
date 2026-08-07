-- Verified teacher seats.
--
-- A teacher seat carries a real allowance (see lib/billing/caps.ts), so it
-- cannot hang off `user_profiles.role`: that column is self-declared at
-- onboarding — `save-profile.ts` takes `body.role` straight from the client —
-- and `authenticated` holds UPDATE on it, with an RLS policy that checks only
-- `auth.uid() = id` and not which columns changed. Anyone could set themselves
-- to 'teacher'. Today that only reveals a UI; billing off the same flag would
-- make it a way to take a paid plan for free.
--
-- So `role` keeps doing what it does (which teacher UI to show) and the
-- allowance hangs off a separate column that only the service role can write.

alter table public.user_profiles
  add column if not exists teacher_verified_at timestamptz,
  add column if not exists teacher_verified_reason text;

-- RLS protects rows, not columns. The policy above would happily accept an
-- update that sets these, so the grants are removed at the column level — the
-- same remedy used for the self-approved-testimonials issue.
revoke update (teacher_verified_at, teacher_verified_reason)
  on public.user_profiles from anon, authenticated;
revoke insert (teacher_verified_at, teacher_verified_reason)
  on public.user_profiles from anon, authenticated;

comment on column public.user_profiles.teacher_verified_at is
  'Set by the service role only. Grants the teacher allowance. Never derive this from the self-declared `role` column.';
comment on column public.user_profiles.teacher_verified_reason is
  'How the seat was granted — e.g. "outreach: <school>", "manual: <who>".';

-- Partial index: the verified set stays small next to the student population.
create index if not exists user_profiles_teacher_verified_idx
  on public.user_profiles (teacher_verified_at)
  where teacher_verified_at is not null;

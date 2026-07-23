-- Lock down user_profiles.reputation against self-service inflation.
--
-- user_profiles has a self-update RLS policy ("Users update own profile",
-- USING/WITH CHECK id = auth.uid()). RLS guards the ROW, not the COLUMN, so a
-- signed-in user could PATCH their own reputation to any value straight through
-- PostgREST — verified: an `authenticated` session set it to 9999. This is the
-- same grant-vs-policy class as the mark_feedback / testimonials lockdown.
--
-- Reputation is meant to be derived solely from the SECURITY DEFINER community
-- vote-sync triggers (trg_community_answer_vote / _note_vote / _question_vote)
-- and from service-role jobs. The app never writes it from client code.
--
-- This BEFORE UPDATE trigger pins reputation to its previous value for writes
-- issued directly by the `authenticated` / `anon` roles. It is SECURITY INVOKER
-- so current_user reflects the true session role: when the vote-sync definer
-- triggers update reputation they execute as the function owner (not
-- authenticated), and service-role jobs run as `service_role` — both pass
-- through unchanged. Legitimate profile edits (name, bio, subjects, email
-- prefs, target grade, role, …) are unaffected; only reputation is held.

create or replace function public.guard_user_profile_reputation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.reputation := old.reputation;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_user_profile_reputation on public.user_profiles;
create trigger trg_guard_user_profile_reputation
  before update on public.user_profiles
  for each row
  execute function public.guard_user_profile_reputation();

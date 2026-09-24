-- The creator brief opt-out lives with the other email preferences.
--
-- 20260923d put it on creators.brief_opt_out; every other email kind switches
-- a user_profiles.email_* column through one shared patch
-- (unsubscribeColumnPatch), and the one-click endpoint and the preferences
-- page both write that table. One more column there keeps the creator brief
-- on the same rails instead of a special case.

alter table public.creators drop column if exists brief_opt_out;

alter table public.user_profiles
  add column if not exists email_creator_brief boolean not null default true;

comment on column public.user_profiles.email_creator_brief is
  'Weekly creator brief (lib/creators/brief.ts). Only read for accounts with a creator seat.';

-- user_profiles has no table-wide client grants; a new column needs its own
-- (20260807182215_user_profiles_column_grants.sql). The preferences page
-- writes it as the signed-in user, like the other email_* columns.
grant insert (email_creator_brief) on public.user_profiles to authenticated;
grant update (email_creator_brief) on public.user_profiles to authenticated;

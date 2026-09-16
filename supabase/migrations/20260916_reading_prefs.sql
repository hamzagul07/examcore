-- A signed-in reader's lesson typography (typeface, size, spacing), so a
-- phone and a laptop agree. Written through /api/account/preferences, which
-- parses the value before storing it (only known typefaces and sizes land);
-- read back by the lesson page on open. Signed-out readers keep the
-- localStorage copy only.
--
-- user_profiles has no table-wide INSERT/UPDATE for clients
-- (20260807182215_user_profiles_column_grants.sql); every writable column is
-- granted by name, so a new column needs its own grant or every write to it
-- is silently rejected by PostgREST.

alter table public.user_profiles
  add column if not exists reading_prefs jsonb;

comment on column public.user_profiles.reading_prefs is
  'Lesson typography choice {font, size, air} — see lib/courses/reading-prefs.ts.';

grant insert (reading_prefs) on public.user_profiles to authenticated;
grant update (reading_prefs) on public.user_profiles to authenticated;

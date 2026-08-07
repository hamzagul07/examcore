-- Actually protect the server-only columns on user_profiles.
--
-- Two earlier migrations in this series (teacher_seats, lock_user_role) tried to
-- protect columns with `revoke update (col) ... from authenticated`. That is a
-- no-op here: PostgreSQL keeps table-level and column-level grants separately,
-- and `authenticated` holds a *table-wide* UPDATE/INSERT grant. A column-level
-- revoke cannot subtract from a table-level grant, so both migrations reported
-- success and changed nothing — `role` and `teacher_verified_at` stayed
-- writable by any signed-in user.
--
-- The only way to restrict columns is to drop the table-level grant and then
-- grant back the specific columns that should be writable.
--
-- Verified after applying with information_schema.column_privileges; see
-- scripts/verify-column-grants.ts, which fails loudly if this ever regresses.

do $$
declare
  -- Columns a user must never write for themselves:
  --   role                    → which teacher/student UI they see
  --   teacher_verified_at     → grants the free teacher allowance
  --   teacher_verified_reason → the audit trail for that grant
  --   reputation              → community standing (also trigger-guarded)
  --   created_at              → immutable bookkeeping
  -- plus the *_sent_at / *_last_sent_at columns, which are how the cron jobs
  -- remember what they have already emailed; a client that could rewrite them
  -- could make itself re-receive or never receive mail.
  protected constant text[] := array[
    'role',
    'teacher_verified_at',
    'teacher_verified_reason',
    'reputation',
    'created_at',
    'community_digest_last_sent_at',
    'review_digest_last_sent_at',
    'streak_nudge_last_sent_at',
    'weekly_report_last_sent_at',
    'trial_end_email_sent_at',
    'trial_ending_email_sent_at'
  ];
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'user_profiles'
     and column_name <> all (protected);

  -- Drop the table-wide grants that were making the column rules unenforceable.
  execute 'revoke update on public.user_profiles from anon, authenticated';
  execute 'revoke insert on public.user_profiles from anon, authenticated';

  -- Grant back precisely the writable columns. Built from the catalogue rather
  -- than hand-listed so a column added later is writable by default and only
  -- the protected list is opt-out — the reverse would silently break writes to
  -- new columns.
  execute format('grant update (%s) on public.user_profiles to anon, authenticated', cols);
  execute format('grant insert (%s) on public.user_profiles to anon, authenticated', cols);
end
$$;

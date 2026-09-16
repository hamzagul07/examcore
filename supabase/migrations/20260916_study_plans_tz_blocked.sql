-- The plan reads its dates in the student's time zone, and can carry specific
-- days the student is away.
--
-- "Today" was the server's UTC date, so a student in Karachi or Singapore
-- opening the dashboard before 08:00 saw yesterday's plan day, and the
-- morning check-in fired at one UTC hour for everyone. The plan now stores
-- the IANA zone the client reported when it was built; the dashboard card
-- and the check-in cron (hourly, sending at 07:00 local) read it.
--
-- blocked_dates is the review's "add personal plans and the AI works around
-- them" for the case a weekly pattern cannot express: away on the 25th.

alter table public.study_plans
  add column if not exists time_zone text not null default 'UTC',
  add column if not exists blocked_dates jsonb not null default '[]'::jsonb;

comment on column public.study_plans.time_zone is
  'IANA zone from the client at build time; today/hour for the card and the check-in are read in it.';
comment on column public.study_plans.blocked_dates is
  'ISO dates the student said they are away; the engine makes them rest days.';

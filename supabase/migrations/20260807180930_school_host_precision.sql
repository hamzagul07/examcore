-- Tighten school-host detection.
--
-- The first version matched `%school%`, `%college%` and `%academy%` anywhere in
-- the host. That put khanacademy.org, schoolsweek.co.uk (a news site),
-- academy.substack.com and preschool-toys.com into the 'school' channel — the
-- single number the teacher-outreach campaign is judged on. A KPI that
-- over-counts is worse than one that under-counts: it reports success that did
-- not happen.
--
-- So detection is now precision-first: only education TLDs, which a commercial
-- site cannot obtain. The trade-off is real and deliberate — a school on a
-- vanity domain (harrowschool.org.uk) now lands in 'referral' instead. Nothing
-- is lost, because the channel report already lists every referring host by
-- name; those are reviewed by eye and, once a school is known, recorded in
-- outreach_targets rather than guessed at from its domain.

create or replace function public.is_school_host(p_host text)
returns boolean
language sql
immutable
as $$
  select p_host is not null and (
    -- UK: schools and universities.
    p_host like '%.sch.uk'
    or p_host like '%.ac.uk'
    -- US and international higher/secondary education.
    or p_host = 'edu'
    or p_host like '%.edu'
    or p_host like '%.edu.%'
    -- Academic second-level domains: .ac.nz, .ac.jp, .ac.in, …
    or p_host like '%.ac.%'
    -- US school districts: lincoln.k12.or.us
    or p_host like '%.k12.%'
    -- Schools under an education SLD: .sch.ae, .sch.id, .school.nz
    or p_host like '%.sch.%'
    or p_host like '%.school.%'
  );
$$;

comment on function public.is_school_host is
  'Education-TLD detection only. Deliberately excludes name matching (school/college/academy in the host), which produced false positives such as khanacademy.org and would inflate the outreach KPI.';

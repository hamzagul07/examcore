-- Teacher seat requests — the missing way in.
--
-- `/for-teachers/start` already turns someone into a teacher: it writes
-- `user_profiles.role = 'teacher'` and creates their first classroom. What it
-- does not do — and cannot, because the column is service-role-only by design
-- (20260807_teacher_seats.sql) — is grant `teacher_verified_at`, the field that
-- actually carries the allowance.
--
-- So the measured state on 2026-09-06 was: 5 accounts with role 'teacher',
-- 5 classrooms, and **0 verified seats**. Every one of those teachers walked
-- into a 5-marks-a-month free tier while being told marking their class was
-- free for them. A teacher who tries to mark a class set and stops at the fifth
-- script does not come back, and none of them did.
--
-- The seat still must not be self-claimable — it is worth real money and `role`
-- is self-declared — so this is a request queue, not a claim. The teacher tells
-- us where they teach; a human approves it with `pnpm teacher:grant --approve`.
-- That keeps the same evidence bar the manual grant had, while removing the
-- part where the teacher had no way to ask.

create table if not exists public.teacher_seat_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  school_name text not null,
  school_email text not null,
  school_country text,
  role_title text,
  class_size integer,
  status text not null default 'pending',
  -- What the reviewer typed when approving/declining; mirrors
  -- user_profiles.teacher_verified_reason so the seat list stays auditable.
  reviewed_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint teacher_seat_requests_status_chk
    check (status in ('pending', 'approved', 'declined')),
  constraint teacher_seat_requests_email_format
    check (school_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint teacher_seat_requests_class_size_chk
    check (class_size is null or (class_size > 0 and class_size <= 2000))
);

-- One open request per teacher. A partial unique index rather than a plain one:
-- a teacher declined once may legitimately apply again with better evidence, and
-- an approved row is history that must not block anything.
create unique index if not exists teacher_seat_requests_one_pending_uidx
  on public.teacher_seat_requests (user_id)
  where status = 'pending';

-- The review queue is read newest-first, filtered to pending.
create index if not exists teacher_seat_requests_status_created_idx
  on public.teacher_seat_requests (status, created_at desc);

alter table public.teacher_seat_requests enable row level security;

-- No policies, and no client grants: this table is written by the API under the
-- service client and read only by the grant script. RLS alone would not be
-- enough — a table-wide grant to `authenticated` would let a teacher update
-- their own row's `status` to 'approved' under a permissive policy, and the
-- whole point of the queue is that the subject of the row cannot approve it.
-- Supabase's default privileges on `public` hand these out on create, so they
-- have to be taken back explicitly.
revoke all on public.teacher_seat_requests from anon, authenticated;

comment on table public.teacher_seat_requests is
  'Requests for a free verified teacher seat. Service-role only — approved by hand via pnpm teacher:grant --approve. The seat itself lives in user_profiles.teacher_verified_at.';

-- Add the new table to the service-role-only audit list. Without this the
-- auditor would happily pass a future migration that re-granted it: the whole
-- reason audit_client_grants() enumerates tables by name is that "nobody would
-- do that" has already been wrong three times in this schema.
create or replace function public.audit_client_grants()
returns table(severity text, detail text)
language plpgsql
security definer
set search_path = public
as $$
declare
  client_roles constant text[] := array['anon', 'authenticated'];
  protected constant text[][] := array[
    array['user_profiles', 'role',                    'gates the whole /teacher surface'],
    array['user_profiles', 'teacher_verified_at',     'grants the free teacher allowance'],
    array['user_profiles', 'teacher_verified_reason', 'the audit trail for that grant'],
    array['user_profiles', 'reputation',              'community standing']
  ];
  service_only constant text[] := array[
    'visit_sessions',
    'outreach_targets',
    'teacher_seat_requests'
  ];
  rpc_allowlist constant text[] := array[
    'teacher_student_ids',
    'user_classroom_ids',
    'teacher_classroom_ids'
  ];
  i integer;
begin
  -- A table-wide INSERT/UPDATE makes every column restriction on that table
  -- unenforceable, however the role came by it.
  for i in 1 .. array_length(protected, 1) loop
    return query
      select 'table-grant'::text,
             format(
               '%s: %s holds a table-wide %s grant (possibly via PUBLIC), which makes every column restriction on this table unenforceable',
               protected[i][1], r.rolname, p.priv
             )
        from unnest(client_roles) as r(rolname)
       cross join unnest(array['INSERT', 'UPDATE']) as p(priv)
       where to_regclass('public.' || protected[i][1]) is not null
         and has_table_privilege(r.rolname, 'public.' || protected[i][1], p.priv);
  end loop;

  for i in 1 .. array_length(protected, 1) loop
    return query
      select 'column'::text,
             format('%s.%s: %s can %s it (possibly via PUBLIC) — %s',
                    protected[i][1], protected[i][2], r.rolname, p.priv, protected[i][3])
        from unnest(client_roles) as r(rolname)
       cross join unnest(array['INSERT', 'UPDATE']) as p(priv)
       where to_regclass('public.' || protected[i][1]) is not null
         and exists (
           select 1 from information_schema.columns c
            where c.table_schema = 'public'
              and c.table_name = protected[i][1]
              and c.column_name = protected[i][2]
         )
         and has_column_privilege(
               r.rolname, 'public.' || protected[i][1], protected[i][2], p.priv
             );
  end loop;

  -- Service-role-only tables: any client reachability at all is a violation.
  return query
    select 'service-only-table'::text,
           format('%s: %s holds %s on a service-role-only table (possibly via PUBLIC)',
                  t.name, r.rolname, p.priv)
      from unnest(service_only) as t(name)
     cross join unnest(client_roles) as r(rolname)
     cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as p(priv)
     where to_regclass('public.' || t.name) is not null
       and has_table_privilege(r.rolname, 'public.' || t.name, p.priv);

  return query
    select 'security-definer-rpc'::text,
           format(
             '%s(%s): %s can execute this SECURITY DEFINER function — it runs as the owner and bypasses RLS. Revoke FROM PUBLIC (revoking from the role alone is a no-op), or add it to rpc_allowlist.',
             p.proname, pg_get_function_identity_arguments(p.oid), r.rolname
           )
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     cross join unnest(client_roles) as r(rolname)
     where n.nspname = 'public'
       and p.prosecdef
       and not (p.proname = any(rpc_allowlist))
       and has_function_privilege(r.rolname, p.oid, 'EXECUTE');
end;
$$;

revoke execute on function public.audit_client_grants() from public;
revoke execute on function public.audit_client_grants() from anon, authenticated;
grant execute on function public.audit_client_grants() to service_role;

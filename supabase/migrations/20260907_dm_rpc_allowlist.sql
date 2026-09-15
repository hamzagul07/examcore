-- Allowlist the four DM RPCs the mobile app calls.
--
-- 20260906_mobile_definer_lockdown.sql revoked the default PUBLIC/anon execute
-- grants across the DM surface, which was the real exposure — push_to_user was
-- callable by any anon-key holder. What it could not revoke is `authenticated`
-- on the four functions that ARE the app's messaging API: dm_open_thread,
-- dm_inbox, dm_mark_read and dm_is_blocked. A signed-in user has to be able to
-- call them, so audit_client_grants() keeps reporting them and `pnpm
-- test:grants` stays red — on a true statement with no action behind it, which
-- is the state in which people start ignoring the check.
--
-- Reviewed before allowlisting, because "the audit is noisy" is exactly how a
-- real finding gets waved through. SECURITY DEFINER is legitimate here: each
-- one bypasses RLS by necessity (it reads or writes across a thread pair) and
-- re-implements the ownership test itself against auth.uid():
--
--   dm_open_thread  raises unless auth.uid() is set, refuses self-messaging,
--                   checks dm_is_blocked, and canonicalises the pair with
--                   least/greatest so a thread cannot be duplicated.
--   dm_inbox        `where auth.uid() in (t.user_a, t.user_b)` — the caller
--                   only ever sees their own threads.
--   dm_mark_read    same predicate in the UPDATE's WHERE clause, so a thread id
--                   belonging to somebody else updates zero rows.
--   dm_is_blocked   fails CLOSED: a caller who is neither party gets `true`
--                   rather than the real answer, so it cannot be used to probe
--                   the block graph.
--
-- The two trigger functions are deliberately NOT listed: `authenticated` holds
-- no execute grant on them (the lockdown revoked it), so the audit does not
-- flag them and adding them would grant nothing but would suggest it had.
--
-- Underlying RLS was checked too and is sound: dm_threads and dm_messages both
-- have RLS enabled, SELECT scoped to participants, and no UPDATE/DELETE policy
-- at all — so those are denied regardless of the table-level grant. The `anon`
-- SELECT grant is inert because every policy keys on auth.uid(), which is null
-- for anon.
--
-- `teacher_seat_requests` is carried in service_only from
-- 20260906_teacher_seat_requests.sql. It is repeated here because `create or
-- replace function` rewrites the whole body: dropping it would silently undo
-- that migration if this one ran second. The to_regclass() guard inside the
-- rule means naming a table that does not exist yet is harmless.

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
  -- Each entry is a function that MUST be callable by a signed-in user and that
  -- enforces its own auth.uid() ownership check. Adding a name here is a
  -- security decision: read the body first.
  rpc_allowlist constant text[] := array[
    'teacher_student_ids',
    'user_classroom_ids',
    'teacher_classroom_ids',
    'dm_open_thread',
    'dm_inbox',
    'dm_mark_read',
    'dm_is_blocked'
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

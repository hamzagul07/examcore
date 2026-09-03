-- The grant audit had the same blind spot for tables that it fixed for functions.
--
-- Found by review. The table and column rules read information_schema and
-- filter on `grantee = any(array['anon','authenticated'])`. A privilege granted
-- to PUBLIC is listed there with grantee 'PUBLIC' and inherited by both roles,
-- so the audit reported no violation for exactly the shape it was written to
-- catch — while the function rule beside it used has_function_privilege and got
-- this right.
--
-- That is the third appearance of this bug in one branch (claim_whole_paper_retry,
-- record_page_event, audit_client_grants itself) and the second inside the
-- auditor. The lesson each time is the same: ask "can this role do it, by any
-- route", never "is this role named in a grant row".
--
-- No live exposure today — the protected tables currently grant to named roles
-- only — so this closes a hole rather than reporting one.
--
-- has_table_privilege / has_column_privilege answer the reachability question
-- directly and account for PUBLIC, role membership and ownership, so the three
-- rules below now use them. information_schema is still the source of the
-- column LIST, because enumerating columns is what it is good for.
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
  service_only constant text[] := array['visit_sessions', 'outreach_targets'];
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

-- A standing check that server-only columns are actually unreachable by clients.
--
-- Motivated by a real failure in this repo: `revoke update (col) on <table> from
-- authenticated` is a no-op while a table-wide UPDATE grant exists, because
-- PostgreSQL tracks table and column privileges separately and a column revoke
-- cannot subtract from a table grant. Three migrations used that form, all
-- reported success, and none of them protected anything — including the column
-- that hands out a free paid plan.
--
-- Asserting the *intent* ("can a client write this?") is the only thing that
-- catches it, and that needs information_schema, which PostgREST will not expose
-- directly. So the audit lives here and the script just reports what it returns.

create or replace function public.audit_client_grants()
returns table (severity text, detail text)
language plpgsql
security definer
set search_path = public
as $$
declare
  client_roles constant text[] := array['anon', 'authenticated'];
  -- Columns no client may write, with the reason stated so a failure explains
  -- itself rather than just naming a column.
  protected constant text[][] := array[
    array['user_profiles', 'role',                    'gates the whole /teacher surface'],
    array['user_profiles', 'teacher_verified_at',     'grants the free teacher allowance'],
    array['user_profiles', 'teacher_verified_reason', 'the audit trail for that grant'],
    array['user_profiles', 'reputation',              'community standing']
  ];
  service_only constant text[] := array['visit_sessions', 'outreach_targets'];
  i integer;
begin
  -- 1. Table-wide write grants on any table holding a protected column. This is
  --    the failure mode that made the column rules unenforceable, so it is
  --    reported on its own and first.
  for i in 1 .. array_length(protected, 1) loop
    return query
      select 'table-grant'::text,
             format(
               '%s: %s holds a table-wide %s grant, which makes every column restriction on this table unenforceable',
               tp.table_name, tp.grantee, tp.privilege_type
             )
        from information_schema.table_privileges tp
       where tp.table_schema = 'public'
         and tp.table_name = protected[i][1]
         and tp.grantee = any(client_roles)
         and tp.privilege_type in ('INSERT', 'UPDATE');
  end loop;

  -- 2. The protected columns themselves.
  for i in 1 .. array_length(protected, 1) loop
    return query
      select 'column'::text,
             format(
               '%s.%s: %s can %s it — %s',
               cp.table_name, cp.column_name, cp.grantee, cp.privilege_type, protected[i][3]
             )
        from information_schema.column_privileges cp
       where cp.table_schema = 'public'
         and cp.table_name = protected[i][1]
         and cp.column_name = protected[i][2]
         and cp.grantee = any(client_roles)
         and cp.privilege_type in ('INSERT', 'UPDATE');
  end loop;

  -- 3. Tables that should carry no client privileges at all.
  return query
    select 'service-only-table'::text,
           format('%s: %s holds %s on a service-role-only table',
                  tp.table_name, tp.grantee, tp.privilege_type)
      from information_schema.table_privileges tp
     where tp.table_schema = 'public'
       and tp.table_name = any(service_only)
       and tp.grantee = any(client_roles);
end;
$$;

revoke all on function public.audit_client_grants() from anon, authenticated;

comment on function public.audit_client_grants is
  'Returns one row per grant violation; an empty result is a pass. Run via pnpm test:grants.';

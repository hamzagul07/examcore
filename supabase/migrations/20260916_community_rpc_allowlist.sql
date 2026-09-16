-- Review the community RPCs the mobile app added, and make the grants audit
-- say something true about them.
--
-- Seven SECURITY DEFINER functions were created directly in production for
-- the mobile community features (polls, reactions, follows, flair). None are
-- in this repo's migrations and none are called by the web app; the mobile
-- app calls the six RPCs. `pnpm test:grants` reported all seven, so the audit
-- was red on a true statement with no action behind it — the state in which
-- people start ignoring it. Each body was read before this decision.
--
-- Writes — signed-in only, and each enforces auth.uid() on its own rows:
--   create_poll(uuid, text[], timestamptz)  raises unless the caller owns the post
--   vote_poll(uuid)                          votes as auth.uid(), refuses null
--   set_user_flair(text)                     updates only `where id = auth.uid()`
-- anon and PUBLIC never held execute on these; made explicit below.
--
-- Reads — aggregate counts over public community data (poll totals, reaction
-- counts, follower counts). They are not ownership-checked by design; the
-- `me`-dependent fields (my vote, my reactions, is_following) are null or
-- empty for anon. The mobile feed is browsable signed out, so anon keeps them.
--   get_poll(uuid), get_reactions(text, uuid), get_follow_stats(uuid)
--
-- Trigger — community_reaction_notify() fires from trg_reaction_notify on
-- community_reactions and inserts the author's notification. A trigger
-- function needs no client execute grant to fire (see
-- 20260906_mobile_definer_lockdown.sql, dm_message_after_insert), so it
-- loses all of them.

revoke execute on function public.community_reaction_notify() from public, anon, authenticated;

revoke execute on function public.create_poll(uuid, text[], timestamptz) from public, anon;
revoke execute on function public.vote_poll(uuid) from public, anon;
revoke execute on function public.set_user_flair(text) from public, anon;

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
    'teacher_seat_requests',
    'study_plans'
  ];
  -- Each entry is either (a) a function that MUST be callable by a signed-in
  -- user and that enforces its own auth.uid() ownership check, or (b) an
  -- aggregate read over public data whose caller-specific fields are empty
  -- for anon. Adding a name here is a security decision: read the body
  -- first, and say which of the two it is.
  rpc_allowlist constant text[] := array[
    -- (a) ownership-checked, signed-in only
    'teacher_student_ids',
    'user_classroom_ids',
    'teacher_classroom_ids',
    'dm_open_thread',
    'dm_inbox',
    'dm_mark_read',
    'dm_is_blocked',
    'create_poll',
    'vote_poll',
    'set_user_flair',
    -- (b) aggregate public reads (20260916_community_rpc_allowlist.sql)
    'get_poll',
    'get_reactions',
    'get_follow_stats'
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

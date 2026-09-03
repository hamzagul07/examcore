-- claim_whole_paper_retry was still callable from the browser.
--
-- 20260824_whole_paper_retry_claim.sql ended with
--
--     revoke execute on function public.claim_whole_paper_retry(uuid, integer)
--       from anon, authenticated;
--
-- which reads like a lockdown and is a no-op. `create function` grants EXECUTE
-- to PUBLIC by default, and revoking from a named role does not subtract from
-- the PUBLIC grant — anon and authenticated kept the privilege through PUBLIC.
-- Confirmed on the live database: proacl was {=X/postgres,postgres=X/postgres,
-- service_role=X/postgres}, where the leading `=X` IS the PUBLIC grant. The two
-- comparable RPCs, reserve_mark_usage and bump_lesson_explanation_demand, carry
-- no such entry because their migrations revoked `from public`.
--
-- This is the function-level twin of the column-grant bug that
-- 20260807_user_profiles_column_grants.sql fixed: a revoke aimed at the wrong
-- grantee reports success and protects nothing.
--
-- What it exposed: the function is SECURITY DEFINER and takes an attempt id with
-- no ownership check — it is safe only because its one caller passes an attempt
-- it has already authorised. Anyone holding the publishable anon key (it ships
-- in the browser bundle) and an attempt id could call it directly and burn that
-- paper's 15 re-marks down to zero, so the owner's next genuine retry is refused.
-- No data is readable this way and no AI spend is triggered; it is a griefing
-- vector against a paying customer's re-marks.
revoke execute on function public.claim_whole_paper_retry(uuid, integer) from public;
revoke execute on function public.claim_whole_paper_retry(uuid, integer) from anon, authenticated;
grant execute on function public.claim_whole_paper_retry(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Make `pnpm test:grants` catch the next one.
-- ---------------------------------------------------------------------------
--
-- The existing rules read information_schema, which reports grants per named
-- grantee and so cannot see a privilege held through PUBLIC — the exact shape of
-- the bug above. has_function_privilege() answers the question that actually
-- matters ("can this role execute it, by any route"), so the new rule uses that.
--
-- Deny by default: every SECURITY DEFINER function in `public` is server-only
-- unless it is named here. A SECURITY DEFINER function runs as its owner and
-- therefore ignores RLS, so client-callable ones need a deliberate decision.
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
  -- Intentionally client-callable SECURITY DEFINER functions.
  --   record_page_event      — the analytics beacon; anon by design, and it
  --                            caps its own writes per session.
  --   teacher_student_ids    — called from inside the attempts/answer-photo RLS
  --   user_classroom_ids       policies, so the signed-in caller must be able to
  --   teacher_classroom_ids    execute it for their own reads to work.
  rpc_allowlist constant text[] := array[
    'record_page_event',
    'teacher_student_ids',
    'user_classroom_ids',
    'teacher_classroom_ids'
  ];
  i integer;
begin
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

  return query
    select 'service-only-table'::text,
           format('%s: %s holds %s on a service-role-only table',
                  tp.table_name, tp.grantee, tp.privilege_type)
      from information_schema.table_privileges tp
     where tp.table_schema = 'public'
       and tp.table_name = any(service_only)
       and tp.grantee = any(client_roles);

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

-- Performance: wrap bare auth.* calls in RLS policies as (select auth.*()).
--
-- 30 policies across the hot tables (attempts, community_*, course_progress,
-- notifications, user_profiles/credits/subscriptions, xp/usage_events, classroom
-- and teacher_override tables) called auth.uid() directly in USING / WITH CHECK.
-- Postgres re-evaluates a bare call PER ROW, so on a large scan the policy runs
-- auth.uid() — and teacher_student_ids(auth.uid()) / user_classroom_ids(...) —
-- once for every row scanned. Wrapping the call in a scalar subquery lets the
-- planner hoist it to an initplan, evaluated ONCE per statement. The result is
-- identical (auth.uid() is stable within a statement); only the evaluation count
-- changes. This is Supabase's documented `auth_rls_initplan` remediation.
--
-- Generated from the live policy definitions and applied with ALTER POLICY, which
-- swaps the expression atomically — there is never a moment where the policy is
-- absent (unlike DROP + CREATE). The bare-call guard in the WHERE makes a re-run
-- a no-op: already-wrapped policies (containing "select auth.*") are skipped, so
-- this never double-wraps.
do $$
declare r record;
begin
  for r in
    select format(
      'alter policy %I on public.%I%s%s',
      policyname, tablename,
      case when qual is not null then
        ' using (' || regexp_replace(regexp_replace(regexp_replace(
            qual,'auth\.uid\(\)','(select auth.uid())','g'),
            'auth\.role\(\)','(select auth.role())','g'),
            'auth\.jwt\(\)','(select auth.jwt())','g') || ')'
      else '' end,
      case when with_check is not null then
        ' with check (' || regexp_replace(regexp_replace(regexp_replace(
            with_check,'auth\.uid\(\)','(select auth.uid())','g'),
            'auth\.role\(\)','(select auth.role())','g'),
            'auth\.jwt\(\)','(select auth.jwt())','g') || ')'
      else '' end
    ) as stmt
    from pg_policies
    where schemaname = 'public'
      and (
        (coalesce(qual,'') ~* 'auth\.(uid|role|jwt)\(\)'
           and coalesce(qual,'') !~* 'select auth\.(uid|role|jwt)')
        or
        (coalesce(with_check,'') ~* 'auth\.(uid|role|jwt)\(\)'
           and coalesce(with_check,'') !~* 'select auth\.(uid|role|jwt)')
      )
  loop
    execute r.stmt;
  end loop;
end $$;

-- Fix teacher attempts RLS + close the RPC it would expose.
--
-- The `attempts` SELECT policy `teacher_read_student_attempts` calls
-- teacher_student_ids(auth.uid()), but the `authenticated` role lacked EXECUTE.
-- Because Postgres OR-evaluates all permissive SELECT policies, EVERY
-- authenticated read of `attempts` failed with `permission denied for function
-- teacher_student_ids` — teacher review and classroom pages (which read attempts
-- via a user client) silently returned empty.
--
-- Granting EXECUTE to authenticated also exposes the function as an RPC, so we
-- first guard it with `uid = auth.uid()`: the function now only ever returns the
-- CALLER's own students. The RLS policy passes auth.uid(), so its behaviour is
-- unchanged; a direct /rest/v1/rpc call with another teacher's uuid returns
-- nothing. anon is intentionally excluded (never a teacher).
create or replace function public.teacher_student_ids(uid uuid)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select distinct cm.student_id
  from classroom_memberships cm
  join classrooms c on cm.classroom_id = c.id
  where c.teacher_id = uid
    and uid = auth.uid()
$function$;

grant execute on function public.teacher_student_ids(uuid) to authenticated;

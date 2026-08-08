-- A teacher could create a classroom but never see it.
--
-- `GET /api/teacher/classrooms` returned 500 with
-- "permission denied for function user_classroom_ids", so the teacher dashboard
-- was permanently empty for everyone. Found by running the signup flow in a
-- browser rather than by reading the code: the row was created correctly and
-- only the read failed, so nothing upstream reported a problem.
--
-- `classrooms` carries two permissive SELECT policies:
--
--   classroom_teacher_access  ALL     auth.uid() = teacher_id
--   classroom_student_read    SELECT  id IN (select user_classroom_ids(auth.uid()))
--
-- Permissive policies are OR'd, and Postgres evaluates all of them — matching
-- the first does not stop the second being run. So every teacher read also
-- evaluated `user_classroom_ids`, which `authenticated` had no EXECUTE grant
-- for, and the whole statement errored.
--
-- Its sibling `teacher_student_ids` already carries this grant, from the same
-- bug being fixed once before on the attempts table. Both functions are
-- SECURITY DEFINER and take the caller's own uid, so granting EXECUTE exposes
-- nothing that the policy did not already intend to expose.

grant execute on function public.user_classroom_ids(uuid) to authenticated;

comment on function public.user_classroom_ids is
  'Classroom ids a student belongs to. Used inside the classroom_student_read RLS policy, so `authenticated` must hold EXECUTE — without it every read of public.classrooms fails, including a teacher reading their own.';

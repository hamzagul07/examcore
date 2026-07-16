-- Add WITH CHECK to the teacher-dashboard FOR ALL policies.
--
-- The policies created in 20250527_teacher_dashboard.sql use `FOR ALL USING (...)`
-- with no WITH CHECK clause. For a FOR ALL policy the USING predicate gates the
-- rows a statement may SEE (SELECT/UPDATE/DELETE targets); WITH CHECK gates the
-- rows a statement may WRITE (INSERT/UPDATE results). With no WITH CHECK,
-- Postgres falls back to USING for writes on classrooms/overrides/interventions,
-- but for `membership_teacher_manage` the USING subquery filters *existing* rows
-- only — an INSERT has no existing row, so the write is not re-validated against
-- the teacher's own classrooms. This recreates each FOR ALL policy with a
-- matching WITH CHECK so INSERT/UPDATE cannot write rows scoped to another
-- teacher. Predicates are identical to the USING clauses — no behavioural change
-- for legitimate access, only an explicit write-side guard.

-- classrooms: a teacher may only create/update rows they own.
DROP POLICY IF EXISTS classroom_teacher_access ON classrooms;
CREATE POLICY classroom_teacher_access ON classrooms
  FOR ALL
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- classroom_memberships: a teacher may only manage memberships of classrooms
-- they own (this is the one that was genuinely unguarded on INSERT).
DROP POLICY IF EXISTS membership_teacher_manage ON classroom_memberships;
CREATE POLICY membership_teacher_manage ON classroom_memberships
  FOR ALL
  USING (
    classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
  )
  WITH CHECK (
    classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
  );

-- teacher_overrides: a teacher may only create/update their own overrides.
DROP POLICY IF EXISTS override_teacher_access ON teacher_overrides;
CREATE POLICY override_teacher_access ON teacher_overrides
  FOR ALL
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- intervention_tests: a teacher may only create/update their own interventions.
DROP POLICY IF EXISTS intervention_teacher_access ON intervention_tests;
CREATE POLICY intervention_teacher_access ON intervention_tests
  FOR ALL
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

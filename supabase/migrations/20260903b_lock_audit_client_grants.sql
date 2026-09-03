-- The grant auditor was exempt from its own rule.
--
-- Found by review. 20260807182356_audit_client_grants.sql ends with
--
--     revoke all on function public.audit_client_grants() from anon, authenticated;
--
-- which is the exact no-op the function now exists to detect: `create function`
-- grants EXECUTE to PUBLIC, and revoking from a named role does not subtract
-- from it. That makes this the third instance of the same bug in this branch,
-- after claim_whole_paper_retry and record_page_event — and this one is in the
-- function that catches the other two.
--
-- On the live database it happens to be clean already, so `pnpm test:grants`
-- passes today. A database built by replaying migrations from scratch — a
-- preview branch, a fresh staging environment, a restore — gets the PUBLIC
-- grant at creation and would then have the new SECURITY DEFINER rule report
-- the auditor as its own violation.
--
-- Its own file rather than an edit to 20260903_visit_country_and_lock_beacon:
-- that migration has already been applied, so an edit would reach every new
-- environment and never reach production. Migrations are append-only once run.
revoke execute on function public.audit_client_grants() from public;
revoke execute on function public.audit_client_grants() from anon, authenticated;
grant execute on function public.audit_client_grants() to service_role;

-- Note for whoever provisions the next database: roughly twenty older
-- migrations revoke SECURITY DEFINER functions `from anon, authenticated`
-- without `from public`, and each one is a no-op in the same way. They are all
-- clean on the current production database, which is why this was never
-- visible. They are deliberately NOT swept here — teacher_student_ids,
-- user_classroom_ids and teacher_classroom_ids are called from inside RLS
-- policies and MUST stay executable by the signed-in caller, so a blanket
-- revoke would break attempt and answer-photo reads. `pnpm test:grants` is the
-- backstop: on a fresh database it names exactly which functions are exposed,
-- and each should be revoked deliberately rather than in bulk.

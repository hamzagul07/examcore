-- Make concurrent whole-paper per-question retries keep each other's work.
--
-- APPLY THIS BEFORE THE APPLICATION DEPLOY. The route falls back to the old
-- whole-row write when these functions are missing, so deploying first does
-- not 500 — it just keeps the race this migration closes.
--
-- The bug: app/api/mark/whole-paper/retry/route.ts read the whole ai_marking
-- JSONB, re-marked one question (30–90s of model time), and wrote the whole
-- JSONB back with that question replaced. Two retries in flight — Q3 and Q7
-- from one impatient student, or a teacher and a student on the same paper —
-- both read the same list, and whichever wrote last erased the other's
-- re-mark. (Code review 2026-09-25, §2 "Whole-paper init hygiene".)
--
-- Two statements, each atomic on the row:
--   patch_whole_paper_question  replaces ONE element of ai_marking->'questions'
--                               and returns the list as it now stands;
--   set_whole_paper_aggregate   writes the recomputed totals (every top-level
--                               key except the list and pages_ocr) only if the
--                               list is still the one the totals were computed
--                               from, otherwise returns the current list so the
--                               route can recompute.
-- The totals themselves (grade projection, dual scores) stay in TypeScript,
-- which is why this is two calls and not one.
--
-- Question numbers are compared the way the app compares them: whitespace
-- stripped, case-folded ("3 (a)" = "3(a)").

create or replace function public.patch_whole_paper_question(
  p_attempt_id uuid,
  p_question_number text,
  p_question jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := lower(regexp_replace(p_question_number, '\s', '', 'g'));
  v_questions jsonb;
begin
  update public.attempts a
     set ai_marking = jsonb_set(
       a.ai_marking,
       '{questions}',
       (
         select coalesce(
           jsonb_agg(
             case
               when lower(regexp_replace(coalesce(q->>'question_number', ''), '\s', '', 'g')) = v_key
                 then p_question
               else q
             end
             order by ord
           ),
           '[]'::jsonb
         )
           from jsonb_array_elements(a.ai_marking->'questions') with ordinality as t(q, ord)
       )
     )
   where a.id = p_attempt_id
     and a.ai_marking->>'upload_mode' = 'whole_paper'
     and jsonb_typeof(a.ai_marking->'questions') = 'array'
  returning a.ai_marking->'questions' into v_questions;

  -- NULL when the attempt is not a finished whole-paper result; the route
  -- treats that as "not found" rather than writing anything.
  return v_questions;
end;
$$;

create or replace function public.set_whole_paper_aggregate(
  p_attempt_id uuid,
  p_aggregate jsonb,
  p_expected_questions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applied boolean := false;
  v_current jsonb;
begin
  -- jsonb equality is structural (key order and whitespace do not matter), so
  -- the list the route received from patch_whole_paper_question compares
  -- equal to the stored one unless another retry has patched it since.
  update public.attempts a
     set ai_marking =
           (p_aggregate - 'questions' - 'pages_ocr')
           || jsonb_build_object('questions', a.ai_marking->'questions')
           || case when a.ai_marking ? 'pages_ocr'
                   then jsonb_build_object('pages_ocr', a.ai_marking->'pages_ocr')
                   else '{}'::jsonb
              end,
         marks_earned = coalesce((p_aggregate->>'marks_earned')::numeric, a.marks_earned),
         total_marks  = coalesce((p_aggregate->>'total_marks')::numeric, a.total_marks)
   where a.id = p_attempt_id
     and a.ai_marking->>'upload_mode' = 'whole_paper'
     and a.ai_marking->'questions' = p_expected_questions
  returning true into v_applied;

  if coalesce(v_applied, false) then
    return jsonb_build_object('applied', true);
  end if;

  select a.ai_marking->'questions' into v_current
    from public.attempts a
   where a.id = p_attempt_id;

  return jsonb_build_object('applied', false, 'questions', coalesce(v_current, '[]'::jsonb));
end;
$$;

-- Service role only. Both take an attempt id with no ownership check — they
-- are safe only because their one caller has already authorised the attempt.
-- `create function` grants EXECUTE to PUBLIC by default and revoking from a
-- named role does not subtract from that grant (see
-- 20260902_lock_claim_whole_paper_retry.sql), so PUBLIC is revoked first.
revoke execute on function public.patch_whole_paper_question(uuid, text, jsonb) from public;
revoke execute on function public.patch_whole_paper_question(uuid, text, jsonb) from anon, authenticated;
grant  execute on function public.patch_whole_paper_question(uuid, text, jsonb) to service_role;

revoke execute on function public.set_whole_paper_aggregate(uuid, jsonb, jsonb) from public;
revoke execute on function public.set_whole_paper_aggregate(uuid, jsonb, jsonb) from anon, authenticated;
grant  execute on function public.set_whole_paper_aggregate(uuid, jsonb, jsonb) to service_role;

comment on function public.patch_whole_paper_question(uuid, text, jsonb) is
  'Atomically replace one question inside attempts.ai_marking->questions for a whole-paper result; returns the list. Service role only.';
comment on function public.set_whole_paper_aggregate(uuid, jsonb, jsonb) is
  'Write recomputed whole-paper totals only if the question list still equals p_expected_questions; otherwise return {applied:false, questions}. Service role only.';

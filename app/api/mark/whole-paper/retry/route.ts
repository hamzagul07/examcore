import { NextRequest, NextResponse } from 'next/server'
import {
  aggregateWholePaperResults,
  type WholePaperAggregate,
} from '@/lib/marking/whole-paper'
import { fetchPaperQuestionMeta } from '@/lib/marking/paper-questions'
import {
  markWholePaperQuestionSafe,
  supabaseAdmin,
} from '@/lib/marking/mark-runner'
import { pagesForQuestion } from '@/lib/marking/whole-paper-pages'
import type { StoredPageOcr } from '@/lib/marking/whole-paper-pages'
import type { QuestionMarkResult } from '@/lib/marking/types'
import { normalizeQuestionNumber } from '@/lib/marking/question-number'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'
import { computeAllowance, quotaExceededBody } from '@/lib/billing/enforcement'
import { withRequestDeadline } from '@/lib/ai/request-deadline'
import { signMarkPayloadForClient } from '@/lib/storage/answer-photos'

// Re-marks one question (derive → mark → verify); headroom for the verify pass.
// vercel.json lists only run/process, so this export is what applies here.
export const maxDuration = 800

// Retries don't consume a quota slot (the paper already used one at run time),
// but they do cost an AI call — cap them per attempt so the endpoint can't be
// scripted into free unlimited marking.
const MAX_RETRIES_PER_ATTEMPT = 15

/** Same wall-clock budget as the other marking routes. */
const RETRY_BUDGET_MS = maxDuration * 1000 - 20_000

/**
 * How many times the totals write is retried when a concurrent retry moved
 * the question list underneath it. The retry cap is 15 per paper, so real
 * contention is two or three at most.
 */
const MAX_AGGREGATE_WRITE_ATTEMPTS = 3

const qKey = (q: string) => normalizeQuestionNumber(q)

type RpcError = { code?: string; message?: string } | null

function isMissingFunctionError(error: RpcError): boolean {
  if (!error) return false
  return (
    error.code === 'PGRST202' ||
    /could not find the function|function .* does not exist/i.test(error.message ?? '')
  )
}

export async function POST(request: NextRequest) {
  return withRequestDeadline(RETRY_BUDGET_MS, () => handleRetry(request))
}

async function handleRetry(request: NextRequest) {
  try {
    const body = await request.json()
    const attemptId = body.attempt_id as string
    const questionNumber = body.question_number as string

    if (!attemptId || !questionNumber) {
      return NextResponse.json(
        { error: 'attempt_id and question_number required' },
        { status: 400 }
      )
    }

    const { supabase: supabaseAuth, user, pendingCookies } =
      await authenticateRouteRequest(request)

    const { data: attempt, error } = await supabaseAdmin
      .from('attempts')
      .select('ai_marking, user_id')
      .eq('id', attemptId)
      .maybeSingle()

    if (error || !attempt?.ai_marking) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.user_id) {
      if (!user) {
        return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
          status: 401,
        })
      }
      // Users blocked at their cap don't get free re-marking either.
      if (attempt.user_id === user.id) {
        const allowance = await computeAllowance(user.id)
        if (allowance.blocked_by_mode) {
          return NextResponse.json(quotaExceededBody(allowance), { status: 402 })
        }
      }
      if (attempt.user_id !== user.id) {
        const teacherCheck = await requireTeacher(supabaseAuth, user.id)
        if (!teacherCheck.ok) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        // Scope to the teacher's own classroom: the attempt was fetched with
        // the service client (no RLS), so re-read it through the RLS-scoped
        // client — a row returns only when this student is in their classroom.
        const { data: scoped } = await supabaseAuth
          .from('attempts')
          .select('id')
          .eq('id', attemptId)
          .maybeSingle()
        if (!scoped) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }
    // Guest papers (user_id null) are gated by the unguessable attempt UUID.
    //
    // This branch used to re-check and re-consume the daily guest limit. The
    // slot was already spent at init and the limit is one a day, so a guest
    // could never retry a failed question: the endpoint existed for them only
    // as a 429. Spend here is bounded by the retry-claim RPC below (15 per
    // paper) — and, for a guest, by what may be retried at all: see the
    // `marking_failed` gate on `prev.status` below.

    const existing = attempt.ai_marking as WholePaperAggregate
    if (existing.upload_mode !== 'whole_paper') {
      return NextResponse.json({ error: 'Not a whole-paper result' }, { status: 400 })
    }

    const paperCode = existing.paper_code
    const paperSession = existing.paper_session
    if (!paperCode || !paperSession) {
      return NextResponse.json({ error: 'Missing paper context' }, { status: 400 })
    }

    const prev = existing.questions.find(
      (q) => qKey(q.question_number) === qKey(questionNumber)
    )
    if (!prev) {
      return NextResponse.json(
        { error: 'That question is not part of this paper.' },
        { status: 404 }
      )
    }
    // Only a question that was actually marked (or failed to be) can be
    // re-marked. A preview-cut row holds no text on purpose: marking it here
    // would be the free tier's question limit with a "retry" button on it.
    if (prev.status === 'not_marked_preview') {
      return NextResponse.json(
        {
          error:
            'This question is beyond the free preview. Upgrade to Scholar to mark the whole paper.',
          upgrade_url: '/pricing',
        },
        { status: 402 }
      )
    }
    if (prev.status === 'unattempted') {
      return NextResponse.json(
        { error: 'No answer was written for this question.' },
        { status: 400 }
      )
    }
    // A guest's whole allowance is the one init a day. Letting a guest
    // re-mark a question that already HAS a mark turned the 15-per-paper
    // retry cap into fifteen further derive → mark → verify runs on Pro per
    // day per IP — a 15x multiplier on the guest cap, with no per-IP
    // accounting on this route. A guest may retry only what actually
    // failed; a second opinion on a marked question is a signed-in feature.
    if (!attempt.user_id && prev.status !== 'marking_failed') {
      return NextResponse.json(
        {
          error:
            'This question already has a mark. Create a free account to re-mark questions.',
          upgrade_url: '/auth/signup',
        },
        { status: 403 }
      )
    }

    const answerText = prev.answer_text || (body.answer_text as string | undefined)
    if (!answerText?.trim()) {
      return NextResponse.json(
        { error: 'No answer text available to retry' },
        { status: 400 }
      )
    }

    // Claim a retry slot BEFORE any AI work.
    //
    // This used to read the count out of ai_marking, do the full derive → mark →
    // verify, and write count + 1 afterwards. Twenty concurrent retries all read
    // the same value, all did the billable work, and last-write-wins left the
    // counter at one — so the cap this endpoint exists to enforce never bound.
    //
    // The RPC is a single UPDATE ... WHERE ... RETURNING, so Postgres serialises
    // callers on the row and exactly one crosses the limit. A null result means
    // the attempt is at the cap and no Gemini call may be made.
    const { data: claimedCount, error: claimError } = await supabaseAdmin.rpc(
      'claim_whole_paper_retry',
      { p_attempt_id: attemptId, p_max: MAX_RETRIES_PER_ATTEMPT }
    )
    if (claimError) {
      console.error('[whole-paper/retry] claim failed:', claimError.message)
      return NextResponse.json(
        { error: 'Could not start the re-mark. Try again in a moment.' },
        { status: 500 }
      )
    }
    if (claimedCount === null || claimedCount === undefined) {
      return NextResponse.json(
        {
          error:
            'Retry limit reached for this paper. Upload the paper again to re-mark it from scratch.',
        },
        { status: 429 }
      )
    }

    const storedPages = (existing.pages_ocr || []) as StoredPageOcr[]
    const questionPages = pagesForQuestion(questionNumber, storedPages)

    const retried = await markWholePaperQuestionSafe({
      paperCode,
      paperSession,
      questionNumber,
      answerText,
      questionPages,
    })
    const patched: QuestionMarkResult = { ...retried, answer_text: answerText }

    const paperQuestions = await fetchPaperQuestionMeta(paperCode, paperSession, {
      listSchemes: async (code, session) => {
        const { data } = await supabaseAdmin
          .from('mark_schemes')
          .select('question_number, total_marks')
          .eq('paper_code', code)
          .eq('paper_session', session)
        return data || []
      },
    })

    // Two writes, both atomic on the row (20260925_whole_paper_question_patch):
    //   1. replace THIS question inside ai_marking->'questions';
    //   2. write the recomputed totals only if the question list is still the
    //      one they were computed from, otherwise take the current list and
    //      recompute.
    // The route used to read the whole JSONB, mark, and write the whole JSONB
    // back, so two students' retries of Q3 and Q7 — or one student's double
    // tap — ended with one of the re-marks silently gone.
    let questions = await patchQuestionAtomically(attemptId, questionNumber, patched)

    let wholePaper: WholePaperAggregate | null = null
    for (let attemptNo = 0; attemptNo < MAX_AGGREGATE_WRITE_ATTEMPTS; attemptNo++) {
      const attempted = questions.filter((q) => q.status !== 'unattempted')
      wholePaper = aggregateWholePaperResults(
        paperCode,
        paperSession,
        attempted,
        paperQuestions,
        { questionLimit: existing.question_limit }
      )
      // Mirrored for display only — whole_paper_retry_count is what the cap is
      // enforced against, and it was already incremented by the claim above.
      wholePaper.retry_count = claimedCount as number

      const outcome = await writeAggregateIfUnchanged(attemptId, wholePaper, questions)
      if (outcome.applied) break
      questions = outcome.questions
      wholePaper = null
    }
    if (!wholePaper) {
      // Every attempt found a newer list. The question itself IS saved; the
      // totals on the row were written by whichever concurrent retry landed
      // last, from a list that included this one. Serve the latest.
      console.warn('[whole-paper/retry] totals write lost to concurrent retries; serving latest')
      wholePaper = aggregateWholePaperResults(
        paperCode,
        paperSession,
        questions.filter((q) => q.status !== 'unattempted'),
        paperQuestions,
        { questionLimit: existing.question_limit }
      )
      wholePaper.retry_count = claimedCount as number
    }

    return NextResponse.json(
      await signMarkPayloadForClient({
        whole_paper: { ...wholePaper, questions, pages_ocr: storedPages },
      })
    )
  } catch (err) {
    console.error('whole-paper retry error:', err)
    return NextResponse.json({ error: 'Retry failed' }, { status: 500 })
  }
}

/**
 * Replace one question inside the stored list, in one statement, and return
 * the list as it now stands. Falls back to a read-modify-write on a database
 * without the migration — the pre-migration behaviour, kept so a preview
 * branch is not a 500.
 */
async function patchQuestionAtomically(
  attemptId: string,
  questionNumber: string,
  question: QuestionMarkResult
): Promise<QuestionMarkResult[]> {
  const { data, error } = await supabaseAdmin.rpc('patch_whole_paper_question', {
    p_attempt_id: attemptId,
    p_question_number: questionNumber,
    p_question: question,
  })
  if (!error && Array.isArray(data)) return data as QuestionMarkResult[]
  if (error && !isMissingFunctionError(error)) throw error

  console.warn(
    '[whole-paper/retry] patch_whole_paper_question not found — apply 20260925_whole_paper_question_patch.sql; falling back to a whole-row write'
  )
  const { data: row } = await supabaseAdmin
    .from('attempts')
    .select('ai_marking')
    .eq('id', attemptId)
    .maybeSingle()
  const current = (row?.ai_marking as WholePaperAggregate | null)?.questions ?? []
  const patched = current.map((q) =>
    qKey(q.question_number) === qKey(questionNumber) ? question : q
  )
  await supabaseAdmin
    .from('attempts')
    .update({ ai_marking: { ...(row?.ai_marking as object), questions: patched } })
    .eq('id', attemptId)
  return patched
}

/**
 * Write everything but the question list, on condition the list is still the
 * one the totals were computed from. Returns the current list when it is not.
 */
async function writeAggregateIfUnchanged(
  attemptId: string,
  wholePaper: WholePaperAggregate,
  expectedQuestions: QuestionMarkResult[]
): Promise<{ applied: true } | { applied: false; questions: QuestionMarkResult[] }> {
  const { questions: _questions, pages_ocr: _pages, ...aggregate } = wholePaper
  const { data, error } = await supabaseAdmin.rpc('set_whole_paper_aggregate', {
    p_attempt_id: attemptId,
    p_aggregate: aggregate,
    p_expected_questions: expectedQuestions,
  })
  if (!error) {
    const result = (data ?? {}) as { applied?: boolean; questions?: QuestionMarkResult[] }
    if (result.applied) return { applied: true }
    return { applied: false, questions: result.questions ?? expectedQuestions }
  }
  if (!isMissingFunctionError(error)) throw error

  // Pre-migration fallback: whole-row write, as before.
  const { data: row } = await supabaseAdmin
    .from('attempts')
    .select('ai_marking')
    .eq('id', attemptId)
    .maybeSingle()
  const stored = row?.ai_marking as WholePaperAggregate | null
  await supabaseAdmin
    .from('attempts')
    .update({
      ai_marking: {
        ...aggregate,
        questions: stored?.questions ?? expectedQuestions,
        pages_ocr: stored?.pages_ocr,
      },
      marks_earned: wholePaper.marks_earned,
      total_marks: wholePaper.total_marks,
    })
    .eq('id', attemptId)
  return { applied: true }
}

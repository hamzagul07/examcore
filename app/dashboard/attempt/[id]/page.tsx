import { createClient as createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  MarkingResultView,
  type MarkingResultData,
} from '@/components/MarkingResultView'
import { SolutionSection } from '@/components/SolutionSection'
import { MarkAgainButton } from './mark-again-button'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'
import {
  ExaminerInkOverlay,
  type LineReference,
} from '@/components/examiner-ink/ExaminerInkOverlay'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type AttemptRow = {
  id: string
  user_id: string | null
  source_type: 'past_paper' | 'other'
  question_text: string | null
  ocr_text: string | null
  ai_marking: MarkingResultData['ai_marking']
  marks_earned: number
  total_marks: number
  full_solution: string | null
  syllabus_tags: string[] | null
  created_at: string
  mark_scheme_id: string | null
  answer_photo_url: string | null
  line_references: LineReference[] | null
  mark_schemes: {
    paper_code: string | null
    paper_session: string | null
    question_number: string | null
  } | null
}

/**
 * Translate the stored attempt row into the shape MarkingResultView expects.
 * `source_type` is the only post-hoc signal we have for past-paper vs general
 * mode — we can't recover the "general_criteria_paper_not_in_db" sub-mode,
 * so it folds into "general_criteria".
 */
function toMarkingResult(attempt: AttemptRow): MarkingResultData {
  const ms = attempt.mark_schemes
  const isPastPaper =
    attempt.source_type === 'past_paper' &&
    !!ms?.paper_code &&
    !!ms?.paper_session &&
    !!ms?.question_number

  return {
    marks_earned: attempt.marks_earned,
    total_marks: attempt.total_marks,
    ai_marking: attempt.ai_marking,
    ocr_text: attempt.ocr_text,
    question_text: attempt.question_text,
    marking_mode: isPastPaper ? 'official_mark_scheme' : 'general_criteria',
    detected_paper:
      isPastPaper && ms
        ? {
            paper_code: ms.paper_code!,
            paper_session: ms.paper_session!,
            question_number: ms.question_number!,
          }
        : null,
    syllabus_tags: attempt.syllabus_tags ?? [],
  }
}

/**
 * Map a stored paper_session string (e.g. "May/June 2024") back into the
 * shape used by the /mark page's manual selection (subject + season + year).
 */
function splitSession(
  paperCode: string | null | undefined,
  paperSession: string | null | undefined
):
  | {
      subject: string
      component: string
      season: string
      year: number
    }
  | null {
  if (!paperCode || !paperSession) return null
  const [subject, component] = paperCode.split('/')
  if (!subject || !component) return null
  const match = paperSession.match(
    /(May\/June|October\/November|February\/March)\s+(\d{4})/i
  )
  if (!match) return null
  const [, season, year] = match
  return { subject, component, season, year: Number(year) }
}

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: attempt } = await supabaseAdmin
    .from('attempts')
    .select(
      `
      id, user_id, source_type, question_text, ocr_text, ai_marking,
      marks_earned, total_marks, full_solution, syllabus_tags, created_at,
      mark_scheme_id, answer_photo_url, line_references,
      mark_schemes ( paper_code, paper_session, question_number )
    `
    )
    .eq('id', id)
    .maybeSingle<AttemptRow>()

  if (!attempt) {
    notFound()
  }

  if (attempt.user_id !== user.id) {
    // Someone else's attempt — don't leak that it exists.
    redirect('/dashboard')
  }

  const result = toMarkingResult(attempt)
  const sessionParts = splitSession(
    attempt.mark_schemes?.paper_code,
    attempt.mark_schemes?.paper_session
  )

  const dateStr = new Date(attempt.created_at).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="animate-entry mb-8 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-dark-900/60 px-3 py-1.5 text-xs font-semibold text-slate-400 backdrop-blur transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to dashboard
        </Link>

        {/* Page header */}
        <div className="animate-entry stagger-1 mb-10">
          <p className="ec-label-tech mb-3">ATTEMPT</p>
          <h1 className="text-[36px] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[48px] md:text-[56px]">
            <span className="gradient-text">
              {result.marking_mode === 'official_mark_scheme' && result.detected_paper
                ? result.detected_paper.paper_code
                : 'Custom'}
            </span>
            {result.marking_mode === 'official_mark_scheme' && result.detected_paper && (
              <>
                <br />
                <span className="ec-text-gradient">
                  Question {result.detected_paper.question_number}
                </span>
              </>
            )}
            {result.marking_mode !== 'official_mark_scheme' && (
              <>
                <br />
                <span className="ec-text-gradient">question</span>
              </>
            )}
          </h1>
          <p className="mt-3 font-mono text-xs text-slate-500">
            Marked on {dateStr}
            {result.marking_mode === 'official_mark_scheme' &&
              result.detected_paper && (
                <> · {result.detected_paper.paper_session}</>
              )}
          </p>
        </div>

        {/* Marking result (re-render of the original feedback) */}
        <div className="animate-entry stagger-2">
          <MarkingResultView result={result} attemptId={attempt.id} />
        </div>

        {/* Examiner's ink overlay — only renders when we have both a saved
            answer image AND positioning data. Older attempts (from before
            Sprint 21) gracefully fall through with no overlay. */}
        {attempt.answer_photo_url &&
          Array.isArray(attempt.line_references) &&
          attempt.line_references.length > 0 && (
            <section className="animate-entry stagger-3 ec-card mt-8 p-6 sm:p-8">
              <p className="ec-label-tech mb-3">EXAMINER&rsquo;S MARKS</p>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--ec-text-primary)] sm:text-3xl">
                Where you earned and lost marks
              </h2>
              <p className="mt-2 mb-6 max-w-2xl text-sm text-slate-400">
                The AI examiner&rsquo;s annotations preserved from when this
                question was marked.
              </p>
              <ExaminerInkOverlay
                imageUrl={attempt.answer_photo_url}
                lineReferences={attempt.line_references}
                animate={false}
              />
            </section>
          )}

        {/* Solution — collapsed by default on the detail page */}
        <div className="animate-entry stagger-4 mt-8">
          <SolutionSection
            attemptId={attempt.id}
            initialSolution={attempt.full_solution}
            startCollapsed
          />
        </div>

        {/* Mark-again CTA — pre-fills the /mark page if this was a past paper */}
        <div className="animate-entry stagger-5 mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {sessionParts ? (
            <MarkAgainButton
              subject={sessionParts.subject}
              year={sessionParts.year}
              season={sessionParts.season}
              component={sessionParts.component}
              questionNumber={result.detected_paper?.question_number}
            />
          ) : (
            <Link
              href="/mark"
              className="ec-btn-primary justify-center text-base sm:w-auto"
              style={{ padding: '16px 28px' }}
            >
              Mark a new question
            </Link>
          )}
          <Link
            href="/dashboard"
            className="ec-btn-secondary justify-center text-base sm:w-auto"
            style={{ padding: '16px 28px' }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
      <OmniAIBridge
        context={{
          type: 'marking_result',
          data: { attemptId: attempt.id },
        }}
      />
    </main>
  )
}

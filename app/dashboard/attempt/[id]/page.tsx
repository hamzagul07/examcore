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
import type { LineReference } from '@/components/examiner-ink/ExaminerInkOverlay'
import { extractMarkSchemeRubric } from '@/lib/marking/mark-scheme-display'
import type { MarkingStyle } from '@/lib/marking/types'
import { signAnswerPhotoUrl } from '@/lib/storage/answer-photos'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { resolveExtractedQuestionId } from '@/lib/community/anchor'
import { PaperDoubtThread } from '@/components/community/PaperDoubtThread'
import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import { accentCssVar, subjectAccent } from '@/lib/courses/margin-notes/subject-meta'

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
    question_text?: string | null
    total_marks?: number | null
    marking_type?: MarkingStyle | null
    mark_scheme?: Record<string, unknown> | null
    syllabus_tags?: string[] | null
  } | null
  time_spent_seconds?: number | null
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
    question_text: attempt.question_text ?? ms?.question_text ?? null,
    marking_mode: isPastPaper ? 'official_mark_scheme' : 'general_criteria',
    detected_paper:
      isPastPaper && ms
        ? {
            paper_code: ms.paper_code!,
            paper_session: ms.paper_session!,
            question_number: ms.question_number!,
          }
        : null,
    syllabus_tags: attempt.syllabus_tags ?? ms?.syllabus_tags ?? [],
    subject_code: ms?.paper_code?.split('/')[0] ?? null,
    time_spent_seconds: attempt.time_spent_seconds ?? null,
    mark_scheme_meta:
      ms?.paper_code && ms?.paper_session
        ? {
            paper_code: ms.paper_code,
            paper_session: ms.paper_session,
            question_number: ms.question_number,
            total_marks: ms.total_marks ?? attempt.total_marks,
            marking_type: ms.marking_type ?? null,
            syllabus_tags: ms.syllabus_tags ?? [],
          }
        : null,
    mark_scheme_rubric: ms?.mark_scheme
      ? extractMarkSchemeRubric(ms.mark_scheme, ms.marking_type)
      : null,
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
      mark_scheme_id, answer_photo_url, line_references, time_spent_seconds,
      mark_schemes (
        paper_code, paper_session, question_number, question_text,
        total_marks, marking_type, mark_scheme, syllabus_tags
      )
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
  const signedPhotoUrl = attempt.answer_photo_url
    ? await signAnswerPhotoUrl(attempt.answer_photo_url)
    : null
  const lineRefs = Array.isArray(attempt.line_references)
    ? (attempt.line_references as LineReference[])
    : []
  const inkPages =
    signedPhotoUrl && lineRefs.length > 0
      ? [{ photo_url: signedPhotoUrl, line_references: lineRefs }]
      : undefined
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

  const communityOn = isCommunityEnabled()
  const pastPaper = result.detected_paper
  const subjectCode =
    pastPaper?.paper_code.split('/')[0] ?? result.subject_code ?? null
  const extractedQuestionId =
    communityOn && pastPaper
      ? await resolveExtractedQuestionId({
          paperCode: pastPaper.paper_code,
          paperSession: pastPaper.paper_session,
          questionNumber: pastPaper.question_number,
        })
      : null
  const communityHref =
    communityOn && subjectCode
      ? extractedQuestionId
        ? `/community?ask=1&subject=${subjectCode}&question=${extractedQuestionId}`
        : pastPaper
          ? `/community?ask=1&subject=${subjectCode}&paper=${pastPaper.paper_code}&session=${pastPaper.paper_session}&q=${pastPaper.question_number}`
          : `/community?ask=1&subject=${subjectCode}`
      : null

  return (
    <main className="app-shell app-shell-tabbed ms-attempt-page">
      <div className="mx-auto min-w-0 max-w-3xl">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="animate-entry mb-8 inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-4 py-2 text-xs font-semibold text-[var(--ec-text-secondary)] backdrop-blur transition-colors hover:border-[color-mix(in_srgb,var(--ec-brand)_40%,transparent)] hover:text-[var(--ec-brand)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to dashboard
        </Link>

        {/* Page header */}
        <div className="animate-entry stagger-1 mb-10">
          <p className="ms-overline mb-3">Attempt</p>
          <h1 className="text-hero">
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
          <p className="mt-3 font-mono text-xs text-[var(--ec-text-secondary)]">
            Marked on {dateStr}
            {result.marking_mode === 'official_mark_scheme' &&
              result.detected_paper && (
                <> · {result.detected_paper.paper_session}</>
              )}
          </p>
        </div>

        {/* Marking result (re-render of the original feedback) */}
        <div className="animate-entry stagger-2">
          <MarkingResultView
            result={result}
            attemptId={attempt.id}
            inkPages={inkPages}
          />
        </div>

        {/* Solution — collapsed by default on the detail page */}
        <div className="animate-entry stagger-3 mt-8">
          <SolutionSection
            attemptId={attempt.id}
            initialSolution={attempt.full_solution}
            startCollapsed
          />
        </div>

        {communityOn && subjectCode && result.marking_mode === 'official_mark_scheme' ? (
          <div className="animate-entry stagger-4 mt-10">
            <PaperDoubtThread
              board="cambridge"
              subjectCode={subjectCode}
              subjectName={SUBJECT_CODE_MAP[subjectCode] ?? subjectCode}
              questionId={extractedQuestionId}
              accent={accentCssVar(subjectAccent(subjectCode))}
            />
          </div>
        ) : null}

        {/* Mark-again CTA — pre-fills the /mark page if this was a past paper */}
        <div className="animate-entry stagger-4 mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
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
              className="ec-btn-primary justify-center px-7 py-4 text-base sm:w-auto"
            >
              Mark a new question
            </Link>
          )}
          {communityHref ? (
            <Link
              href={communityHref}
              className="ec-btn-secondary justify-center px-7 py-4 text-base sm:w-auto"
            >
              Ask the room about this question
            </Link>
          ) : null}
          <Link
            href="/dashboard"
            className="ec-btn-secondary justify-center px-7 py-4 text-base sm:w-auto"
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

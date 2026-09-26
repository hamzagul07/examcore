import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { signAnswerPhotoUrl } from '@/lib/storage/answer-photos'
import { requireTeacher } from '@/lib/teacher-auth'
import { isUuid } from '@/lib/teacher/assignments/validate'
import { displayName } from '@/lib/teacher/display-name'
import { DECISION_LABEL, DECISION_STAMP } from '@/lib/teacher/override-validate'
import {
  EMPTY_REVIEW_FILTERS,
  loadAttemptReview,
  loadReviewQueue,
  parseReviewFilters,
  reviewDetailHref,
  reviewNeighbours,
  reviewsInboxHref,
  type AttemptReview,
} from '@/lib/teacher/reviews-query'
import type { LineReference } from '@/components/examiner-ink/ExaminerInkOverlay'
import { ExaminerInkPerPage } from '@/components/examiner-ink/ExaminerInkPerPage'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { TeacherBackLink, TeacherDeskHead, TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { ReviewConsole } from '@/components/teacher/ReviewConsole'
import { FeedbackComposer } from '@/components/teacher/FeedbackComposer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Review' }

type SearchParams = Record<string, string | string[] | undefined>

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

function longDate(iso: string): string {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? DATE_FORMAT.format(t) : ''
}

/** The decisions this teacher has made on the script, newest first. */
function DecisionHistory({ review }: { review: AttemptReview }) {
  if (review.decisions.length === 0) return null
  const total = review.attempt.total_marks
  return (
    <section aria-labelledby="review-history-title" className="mt-4 rounded-[4px] border border-dashed border-[var(--ec-border)] p-4">
      <h2 id="review-history-title" className="ms-review-console__title mb-3">
        Your decisions on this script
      </h2>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {review.decisions.map((d) => (
          <li key={d.id} className="flex flex-col gap-1 text-sm">
            <span className="flex flex-wrap items-center gap-2">
              <span className="ec-chip ec-chip-neutral" aria-hidden>
                {DECISION_STAMP[d.decision]}
              </span>
              <span className="font-semibold text-[var(--ec-text-primary)]">{DECISION_LABEL[d.decision]}</span>
              {d.decision === 'override' && d.override_total_earned !== null ? (
                <span className="font-mono text-[var(--ec-text-secondary)]">
                  to {d.override_total_earned}
                  {total !== null ? `/${total}` : ''}
                </span>
              ) : null}
              <span className="text-[var(--ec-text-secondary)]">· {longDate(d.created_at)}</span>
              <span className="text-xs text-[var(--ec-text-faint)]">
                {d.decision === 'flag' ? 'private' : d.student_visible ? 'student told' : 'not shown to the student'}
              </span>
            </span>
            {d.reasoning_note ? (
              <span className="whitespace-pre-wrap text-[var(--ec-text-secondary)] [overflow-wrap:anywhere]">
                {d.reasoning_note}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * One script under review (spec §4): the student's pages with the examiner's
 * ink on the left, the ReviewConsole on the right, the teacher's notes to the
 * student below. Prev/next walk the same filter the teacher came from (the
 * inbox's query string is carried on every link).
 *
 * 404 (the teacher frame's "Not on your desk") for anything the teacher may
 * not review — a malformed id, another teacher's student, a student who left,
 * work from before they joined or outside the class's subject.
 */
export default async function TeacherReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>
  searchParams: Promise<SearchParams>
}) {
  const [{ attemptId }, sp] = await Promise.all([params, searchParams])
  if (!isUuid(attemptId)) notFound()
  const parsed = parseReviewFilters(sp)
  // A mangled filter should not hide the script: drop it, keep the page.
  const filters = parsed.ok ? parsed.value : EMPTY_REVIEW_FILTERS

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/signin?next=${encodeURIComponent(reviewDetailHref(attemptId, filters))}`)
  const teacher = await requireTeacher(supabase, user.id)
  if (!teacher.ok) redirect('/dashboard')

  const admin = createServiceClient()
  const review = await loadAttemptReview(supabase, admin, user.id, attemptId, {
    signPhoto: (stored) => signAnswerPhotoUrl(stored),
  })
  if (!review) notFound()

  // Prev/next are a convenience: if the queue cannot be read the page still works.
  const queue = await loadReviewQueue(supabase, admin, user.id, filters).catch((err: unknown) => {
    console.error('[teacher/review] neighbours failed:', err instanceof Error ? err.message : err)
    return null
  })
  const list = queue?.ok ? queue.items : []
  const around = reviewNeighbours(list, review.attempt.id, review.order)
  const inboxHref = reviewsInboxHref(filters)

  const firstName = review.student.full_name ? (displayName(review.student.full_name).split(' ')[0] ?? 'the student') : 'the student'
  const latest = review.decisions[0] ?? null
  const lead = [
    review.work_label,
    review.set?.is_mock ? 'Mock' : null,
    review.classroom.name,
    `marked ${longDate(review.attempt.created_at)}`,
  ]
    .filter(Boolean)
    .join(' · ')
  const pages = review.ink.map((p) => ({ photo_url: p.photo_url, line_references: p.line_references as LineReference[] }))

  return (
    <TeacherPageContainer className="ms-teacher-review-detail">
      <TeacherBackLink href={inboxHref}>&larr; Back to reviews</TeacherBackLink>

      <TeacherDeskHead
        eyebrow="Review"
        stamp={latest ? DECISION_STAMP[latest.decision] : 'RV'}
        title={review.student.full_name ?? review.student.display_name}
        lead={lead}
      />

      {review.attempt.question_text ? (
        <section aria-labelledby="review-question-title" className="ec-card ec-card--paper mb-6 min-w-0 p-4">
          <h2 id="review-question-title" className="ec-label-tech mb-2">
            Question
          </h2>
          <RichTextRenderer text={review.attempt.question_text} contentKind="question" />
        </section>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-3">
          <section aria-labelledby="review-script-title" className="ec-card ec-card--paper min-w-0 overflow-hidden p-4">
            <h2 id="review-script-title" className="ec-label-tech mb-3">
              {firstName === 'the student' ? "Student's script" : `${firstName}'s script`}
            </h2>
            {pages.length > 0 ? (
              <ExaminerInkPerPage pages={pages} attemptId={review.attempt.id} animate={false} />
            ) : review.attempt.answer_text ? (
              <div className="min-w-0">
                <p className="mb-2 text-xs text-[var(--ec-text-faint)]">Typed or transcribed answer — no photo was uploaded.</p>
                <RichTextRenderer text={review.attempt.answer_text} contentKind="marking" />
              </div>
            ) : (
              <p className="m-0 text-sm text-[var(--ec-text-secondary)]">
                No photo or typed answer is stored for this script. The marks on the right are what the marker gave.
              </p>
            )}
          </section>

          {review.attempt.summary ? (
            <section aria-labelledby="review-summary-title" className="ec-card ec-card--paper min-w-0 p-4">
              <h2 id="review-summary-title" className="ec-label-tech mb-2">
                Marker&apos;s summary
              </h2>
              <RichTextRenderer text={review.attempt.summary} contentKind="marking" />
            </section>
          ) : null}
        </div>

        <div className="min-w-0 lg:col-span-2">
          <ReviewConsole
            key={review.attempt.id}
            attemptId={review.attempt.id}
            studentFirstName={firstName}
            marksEarned={review.attempt.marks_earned}
            totalMarks={review.attempt.total_marks}
            aiMarksEarned={review.attempt.ai_marks_earned}
            marking={review.attempt.marking}
            totalOnlyBasis={review.attempt.total_only_basis}
            marks={review.attempt.marks}
            judgement={review.attempt.judgement}
            latestDecision={latest ? { decision: latest.decision, created_at: latest.created_at } : null}
            nav={{
              prevHref: around.prev ? reviewDetailHref(around.prev.attempt_id, filters) : null,
              nextHref: around.next ? reviewDetailHref(around.next.attempt_id, filters) : null,
              inboxHref,
              index: around.index,
              total: around.total,
            }}
          />
          <DecisionHistory review={review} />
        </div>
      </div>

      <section aria-labelledby="review-feedback-title" className="ec-card ec-card--paper mt-8 min-w-0 p-4 sm:p-6">
        <h2 id="review-feedback-title" className="mb-4 text-xl font-bold text-[var(--ec-text-primary)] sm:text-2xl">
          {firstName === 'the student' ? 'Notes to the student' : `Notes to ${firstName}`}
        </h2>
        <FeedbackComposer
          key={review.attempt.id}
          attemptId={review.attempt.id}
          classroomId={review.classroom.id}
          studentFirstName={firstName}
          notes={review.feedback}
        />
      </section>
    </TeacherPageContainer>
  )
}

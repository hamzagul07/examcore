'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { AskOmniAboutMark } from '@/components/omni-ai/AskOmniAboutMark'
import { ExaminerInkPerPage } from '@/components/examiner-ink/ExaminerInkPerPage'
import type { LineReference } from '@/components/examiner-ink/ExaminerInkOverlay'
import type { QuestionMarkResult, WholePaperResult } from '@/lib/marking/types'

function plainSnippet(text: string, max = 88): string {
  const stripped = text.replace(/[#*_`[\]()$]/g, '').replace(/\s+/g, ' ').trim()
  return stripped.length <= max ? stripped : `${stripped.slice(0, max - 1)}…`
}

function scoreBarColor(pct: number, skipped: boolean): string {
  if (skipped) return 'var(--ec-text-faint)'
  if (pct >= 80) return 'var(--ec-brand)'
  if (pct >= 55) return 'var(--ec-banner-warning-title, #b8860b)'
  return 'var(--ec-error-ink, var(--ec-score-low, #b04848))'
}

function QuestionInkSection({
  question,
  attemptId,
}: {
  question: QuestionMarkResult
  attemptId?: string | null
}) {
  if (question.marking_style === 'level_of_response') return null

  const inkPages = question.ink_pages
  if (inkPages && inkPages.length > 0) {
    return (
      <div className="mt-4">
        <p className="ms-overline">Examiner&apos;s ink</p>
        <ExaminerInkPerPage
          pages={inkPages.map((p) => ({
            photo_url: p.photo_url,
            line_references: (p.line_references || []) as LineReference[],
          }))}
          attemptId={attemptId ?? undefined}
          animate={false}
        />
      </div>
    )
  }

  const lineRefs = (question.line_references || []) as LineReference[]
  const photoUrl = question.answer_photo_url
  if (!photoUrl || lineRefs.filter((r) => r.bbox).length === 0) return null

  return (
    <div className="mt-4">
      <p className="ms-overline">Examiner&apos;s ink</p>
      <ExaminerInkPerPage
        pages={[{ photo_url: photoUrl, line_references: lineRefs }]}
        attemptId={attemptId ?? undefined}
        animate={false}
      />
    </div>
  )
}

function QuestionDetail({
  question,
  attemptId,
}: {
  question: QuestionMarkResult
  attemptId?: string | null
}) {
  const ai = question.ai_marking

  // IB multi-criterion breakdown (essays / IA) — render the per-criterion detail,
  // not just the holistic band, matching the single-question view.
  if (ai.criteria_results && ai.criteria_results.length > 0) {
    return (
      <div className="mt-4 space-y-3 border-t border-[var(--ec-border)] pt-4 text-sm">
        <p className="ms-overline">IB criteria breakdown</p>
        <div className="space-y-3">
          {ai.criteria_results.map((c) => (
            <div
              key={c.criterion}
              className="rounded-xl border border-[var(--ec-border)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold">
                  {c.criterion} — {c.criterion_name}
                </span>
                <span className="ms-grade-pill">
                  {c.marks_awarded}/{c.marks_available} · L{c.level}
                </span>
              </div>
              {c.band_descriptor && (
                <p className="mt-2 text-xs text-[var(--ec-text-secondary)]">
                  {c.band_descriptor}
                </p>
              )}
              <div className="mt-2">
                <RichTextRenderer text={c.justification} />
              </div>
            </div>
          ))}
        </div>
        {ai.summary && (
          <RichTextRenderer
            text={ai.summary}
            className="text-[var(--ec-text-secondary)]"
          />
        )}
      </div>
    )
  }

  if (question.marking_style === 'level_of_response' && ai.band_result) {
    return (
      <div className="mt-4 space-y-3 border-t border-[var(--ec-border)] pt-4 text-sm">
        <p className="font-semibold text-[var(--ec-banner-warning-title)]">
          Band {ai.band_result.level} — {ai.band_result.marks_awarded}/
          {ai.band_result.marks_available} marks
        </p>
        <RichTextRenderer text={ai.band_result.justification} />
        {ai.band_result.strengths && ai.band_result.strengths.length > 0 && (
          <ul className="list-inside list-disc text-[var(--ec-text-secondary)]">
            {ai.band_result.strengths.map((s, i) => (
              <li key={i}>
                <RichTextRenderer text={s} />
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  if (ai.mcq_breakdown && ai.mcq_breakdown.length > 0) {
    return (
      <div className="mt-4 space-y-2 border-t border-[var(--ec-border)] pt-4">
        {ai.mcq_breakdown.map((row) => (
          <div
            key={row.question_number}
            className={`rounded-lg border p-3 text-sm ${
              row.correct
                ? 'ec-tint-success-chip border-0'
                : 'ec-tint-critical-chip'
            }`}
          >
            <span className="font-mono text-xs">{row.question_number}</span>: you{' '}
            {row.student_answer} — correct: {row.correct_answer}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3 border-t border-[var(--ec-border)] pt-4">
      <QuestionInkSection question={question} attemptId={attemptId} />
      {ai.marks_awarded && ai.marks_awarded.length > 0 && (
        <div className="space-y-2">
          {ai.marks_awarded.map((mark) => (
            <div
              key={String(mark.mark_id)}
              className={`rounded-xl border p-4 text-sm ${
                mark.earned
                  ? 'ec-tint-success-chip border-0'
                  : 'ec-tint-critical-chip'
              }`}
            >
              <span className="font-mono text-xs font-bold">{mark.type}</span>
              <span
                className={`ml-2 text-xs ${mark.earned ? 'ec-score-high' : 'ec-score-low'}`}
              >
                {mark.earned ? 'Earned' : 'Not earned'}
              </span>
              <div className="mt-2">
                <RichTextRenderer text={mark.reasoning} />
              </div>
            </div>
          ))}
        </div>
      )}
      <RichTextRenderer text={ai.summary} className="text-[var(--ec-text-secondary)]" />
    </div>
  )
}

function GradeCard({
  label,
  block,
}: {
  label: string
  block: {
    marks_earned: number
    total_marks: number
    percentage: number
    estimated_grade?: string
    grade_note?: string
  }
}) {
  return (
    <div className="ms-wp-grade-card">
      <p className="ms-overline">{label}</p>
      {block.estimated_grade ? (
        <div className="ms-big-grade">{block.estimated_grade.replace(/^~/, '')}</div>
      ) : (
        <div className="ms-big-grade">
          {block.marks_earned}
          <span style={{ fontSize: '0.45em', opacity: 0.65 }}>/{block.total_marks}</span>
        </div>
      )}
      <p className="ms-body-2" style={{ marginTop: 10 }}>
        {block.marks_earned}/{block.total_marks} marks ({block.percentage}%)
        {block.grade_note ? ` — ${block.grade_note}` : null}
      </p>
    </div>
  )
}

export function WholePaperResultView({
  result,
  attemptId,
  onRetryQuestion,
}: {
  result: WholePaperResult
  attemptId?: string | null
  answerPhotoUrl?: string | null
  onRetryQuestion?: (questionNumber: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  const showDual = result.show_dual_scores && result.attempted_score
  const primaryScore = showDual ? result.attempted_score! : result
  const overlineParts = [result.paper_code, result.paper_session, 'whole paper'].filter(Boolean)

  const fixNext = useMemo(
    () =>
      result.questions
        .filter(
          (q) =>
            q.status !== 'unattempted' &&
            q.status !== 'marking_failed' &&
            q.marks_earned < q.total_marks
        )
        .map((q) => ({
          lost: q.total_marks - q.marks_earned,
          question: q,
        }))
        .sort((a, b) => b.lost - a.lost)
        .slice(0, 2),
    [result.questions]
  )

  return (
    <div className="ms-whole-paper-result space-y-6">
      {result.questions_excluded_count ? (
        <div className="ec-banner ec-banner-warning">
          <AlertCircle className="ec-banner__icon h-5 w-5 shrink-0" />
          <p className="ec-banner__meta">
            {result.questions_excluded_count} question
            {result.questions_excluded_count > 1 ? 's' : ''} excluded due to error
            — totals below reflect only successfully marked questions.
          </p>
        </div>
      ) : null}

      <div className="ms-mark-result-head">
        <div>
          {overlineParts.length ? (
            <p className="ms-overline" style={{ marginBottom: 8 }}>
              {overlineParts.join(' · ')}
            </p>
          ) : null}
          <h2 className="ms-h2" style={{ marginBottom: 0 }}>
            {primaryScore.marks_earned} / {primaryScore.total_marks}
            {primaryScore.estimated_grade ? (
              <>
                {' '}
                — <em>projected grade {primaryScore.estimated_grade.replace(/^~/, '')}.</em>
              </>
            ) : (
              <> — <em>whole paper marked.</em></>
            )}
          </h2>
        </div>
      </div>

      {showDual ? (
        <p className="ms-body-2">
          <strong className="text-[var(--ec-text-primary)]">On what you attempted</strong>{' '}
          is your performance on questions you wrote;{' '}
          <strong className="text-[var(--ec-text-primary)]">full paper score</strong> treats
          skipped questions as zero.
        </p>
      ) : null}

      <div className="ms-wp-grid">
        <div className="space-y-4">
          {showDual && result.attempted_score && result.full_paper_score ? (
            <>
              <GradeCard label="On what you attempted" block={result.attempted_score} />
              <GradeCard label="Full paper score" block={result.full_paper_score} />
            </>
          ) : (
            <GradeCard
              label="Projected grade"
              block={{
                marks_earned: result.marks_earned,
                total_marks: result.total_marks,
                percentage: result.percentage,
                estimated_grade: result.estimated_grade,
                grade_note: result.grade_note,
              }}
            />
          )}

          {fixNext.length > 0 ? (
            <div className="ms-mark-form-card">
              <p className="ms-overline">Fix next</p>
              {fixNext.map(({ lost, question }) => (
                <div key={question.question_number} className="ms-fix-item">
                  <span className="ec-chip-ms ec-chip-ms--no">−{lost}</span>
                  <span>
                    <b>Q{question.question_number}</b>
                    {' — '}
                    {plainSnippet(question.summary)}
                  </span>
                  <button
                    type="button"
                    className="ec-btn-underline ml-auto shrink-0 text-sm"
                    onClick={() => setExpanded(question.question_number)}
                  >
                    review →
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="ms-mark-form-card">
            <p className="ms-overline">Summary</p>
            <div className="ms-body-2" style={{ marginTop: 10 }}>
              <RichTextRenderer text={result.summary} />
            </div>
          </div>

          {attemptId ? (
            <div className="flex justify-center">
              <AskOmniAboutMark attemptId={attemptId} />
            </div>
          ) : null}
        </div>

        <div className="ms-audit-card">
          <div className="ms-audit-head">
            <span className="ms-micro">QUESTION BY QUESTION</span>
            <span className="ms-micro">TAP FOR EXAMINER&apos;S INK</span>
          </div>
          {result.questions.map((q) => {
            const isUnattempted = q.status === 'unattempted'
            const isFailed = q.status === 'marking_failed'
            const isOpen = expanded === q.question_number
            const pct =
              isUnattempted || q.total_marks <= 0
                ? 0
                : (q.marks_earned / q.total_marks) * 100
            const col = scoreBarColor(pct, isUnattempted)

            return (
              <div key={q.question_number}>
                <button
                  type="button"
                  className={`ms-wp-qrow ${isUnattempted ? 'ms-wp-skipped' : ''}`}
                  onClick={() =>
                    !isUnattempted &&
                    setExpanded(isOpen ? null : q.question_number)
                  }
                  disabled={isUnattempted}
                >
                  <span className="qn" style={{ color: col }}>
                    Q{q.question_number}
                  </span>
                  <span className="qt line-clamp-2">
                    {isFailed ? 'Marking failed' : q.summary}
                  </span>
                  <span className="ms-wp-qbar" aria-hidden>
                    <i style={{ width: `${pct}%`, background: col }} />
                  </span>
                  <span className="qs" style={{ color: col }}>
                    {isUnattempted
                      ? 'skipped'
                      : isFailed
                        ? 'failed'
                        : `${q.marks_earned}/${q.total_marks}`}
                  </span>
                </button>

                {isFailed && onRetryQuestion && attemptId && (
                  <div className="border-b border-[var(--ec-border)] px-[18px] pb-3">
                    <button
                      type="button"
                      disabled={retrying === q.question_number}
                      onClick={async () => {
                        setRetrying(q.question_number)
                        await onRetryQuestion(q.question_number)
                        setRetrying(null)
                      }}
                      className="ec-btn-secondary text-sm"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {retrying === q.question_number ? 'Retrying…' : 'Retry this question'}
                    </button>
                  </div>
                )}

                <AnimatePresence>
                  {isOpen && !isUnattempted && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-b border-[var(--ec-border)]"
                    >
                      <div className="px-[18px] py-4">
                        <div className="mb-2 flex items-center gap-2">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-[var(--ec-text-secondary)]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-[var(--ec-text-secondary)]" />
                          )}
                          <span className="rounded-full border border-[var(--ec-border)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--ec-text-secondary)]">
                            {q.marking_style.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <QuestionDetail question={q} attemptId={attemptId} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
          <div className="ms-audit-total">
            <span className="font-mono text-sm font-bold text-[var(--ec-brand)]">
              TOTAL {primaryScore.marks_earned} / {primaryScore.total_marks}
              {showDual ? ' ATTEMPTED' : ''}
            </span>
            {primaryScore.estimated_grade ? (
              <span className="ms-grade-pill">
                projected: {primaryScore.estimated_grade.replace(/^~/, '')}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

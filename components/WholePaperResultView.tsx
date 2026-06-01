'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedScore } from '@/components/effects/AnimatedScore'
import { Progress } from '@/components/ui/Progress'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { AskOmniAboutMark } from '@/components/omni-ai/AskOmniAboutMark'
import { ExaminerInkPerPage } from '@/components/examiner-ink/ExaminerInkPerPage'
import type { LineReference } from '@/components/examiner-ink/ExaminerInkOverlay'
import type { QuestionMarkResult, WholePaperResult } from '@/lib/marking/types'

function ScoreCard({
  title,
  subtitle,
  block,
}: {
  title: string
  subtitle: string
  block: {
    marks_earned: number
    total_marks: number
    percentage: number
    estimated_grade?: string
    grade_note?: string
  }
}) {
  return (
    <div className="ec-card flex-1 p-6 text-center sm:p-8">
      <p className="ec-label-tech mb-2">{title}</p>
      <p className="mb-4 text-xs text-[var(--ec-text-secondary)]">{subtitle}</p>
      <AnimatedScore
        earned={block.marks_earned}
        total={block.total_marks}
        caption="marks"
      />
      <div className="mx-auto mt-4 max-w-xs">
        <Progress
          value={block.percentage}
          variant={block.percentage >= 70 ? 'emerald' : 'spectrum'}
        />
        <p className="mt-1 font-mono text-sm text-[var(--ec-text-secondary)]">{block.percentage}%</p>
      </div>
      {block.estimated_grade && (
        <p className="mt-3 text-sm font-semibold ec-score-high">
          ~{block.estimated_grade}
        </p>
      )}
    </div>
  )
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
        <p className="ec-label-tech mb-3">EXAMINER&apos;S INK</p>
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
      <p className="ec-label-tech mb-3">EXAMINER&apos;S INK</p>
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

  return (
    <div className="space-y-6">
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

      {showDual ? (
        <>
          <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            If you only completed some questions, here&apos;s what each score means:{' '}
            <strong className="text-[var(--ec-text-secondary)]">On what you attempted</strong> is
            your performance on questions you wrote;{' '}
            <strong className="text-[var(--ec-text-secondary)]">Full paper score</strong> treats
            skipped questions as zero.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <ScoreCard
              title="ON WHAT YOU ATTEMPTED"
              subtitle="Performance on questions you wrote"
              block={result.attempted_score!}
            />
            <ScoreCard
              title="FULL PAPER SCORE"
              subtitle="Unattempted questions count as zero"
              block={result.full_paper_score!}
            />
          </div>
        </>
      ) : (
        <div className="ec-card-brand relative overflow-hidden p-8 text-center sm:p-14">
          <p className="ec-label-tech mb-6">WHOLE PAPER SCORE</p>
          <AnimatedScore
            earned={result.marks_earned}
            total={result.total_marks}
            caption="marks earned"
          />
          <div className="mx-auto mt-8 max-w-sm">
            <Progress
              value={result.percentage}
              variant={result.percentage >= 70 ? 'emerald' : 'spectrum'}
            />
            <p className="mt-2 font-mono text-sm text-[var(--ec-text-secondary)]">
              {result.percentage}%
            </p>
          </div>
          {result.estimated_grade && (
            <p className="mt-4 text-lg font-semibold ec-score-high">
              Estimated grade: {result.estimated_grade}
              <span className="mt-1 block text-xs font-normal text-[var(--ec-text-secondary)]">
                {result.grade_note}
              </span>
            </p>
          )}
        </div>
      )}

      {result.paper_code && (
        <p className="text-center font-mono text-xs text-[var(--ec-text-secondary)]">
          {result.paper_code} · {result.paper_session}
        </p>
      )}

      <div className="ec-card p-6">
        <p className="ec-label-tech mb-3">SUMMARY</p>
        <RichTextRenderer text={result.summary} className="text-[var(--ec-text-secondary)]" />
      </div>

      {attemptId && (
        <div className="flex justify-center">
          <AskOmniAboutMark attemptId={attemptId} />
        </div>
      )}

      <div className="ec-card p-6">
        <p className="ec-label-tech mb-4">ALL QUESTIONS</p>
        <div className="space-y-2">
          {result.questions.map((q) => {
            const isUnattempted = q.status === 'unattempted'
            const isFailed = q.status === 'marking_failed'
            const isOpen = expanded === q.question_number

            return (
              <div
                key={q.question_number}
                className={`rounded-xl border p-4 transition-colors ${
                  isUnattempted
                    ? 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)] opacity-60'
                    : isFailed
                      ? 'ec-tint-critical-panel'
                      : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)]'
                }`}
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() =>
                    setExpanded(isOpen ? null : q.question_number)
                  }
                  disabled={isUnattempted}
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-[var(--ec-text-secondary)]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[var(--ec-text-secondary)]" />
                    )}
                    <span
                      className={`font-semibold ${isUnattempted ? 'text-[var(--ec-text-secondary)]' : 'text-[var(--ec-text-primary)]'}`}
                    >
                      Q{q.question_number}
                    </span>
                    {!isUnattempted && (
                      <span className="rounded-full border border-[var(--ec-border)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--ec-text-secondary)]">
                        {q.marking_style.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-mono text-lg font-bold ${
                      isUnattempted
                        ? 'text-[var(--ec-text-secondary)]'
                        : isFailed
                          ? 'ec-score-low'
                          : 'ec-score-high'
                    }`}
                  >
                    {isUnattempted
                      ? `Not attempted — 0/${q.total_marks}`
                      : isFailed
                        ? 'Marking failed'
                        : `${q.marks_earned}/${q.total_marks}`}
                  </span>
                </button>

                {!isUnattempted && !isOpen && (
                  <div className="mt-2 pl-6 text-sm text-[var(--ec-text-secondary)]">
                    <RichTextRenderer text={q.summary} />
                  </div>
                )}

                {isFailed && onRetryQuestion && attemptId && (
                  <button
                    type="button"
                    disabled={retrying === q.question_number}
                    onClick={async () => {
                      setRetrying(q.question_number)
                      await onRetryQuestion(q.question_number)
                      setRetrying(null)
                    }}
                    className="ec-btn-secondary mt-3 ml-6 text-sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {retrying === q.question_number
                      ? 'Retrying…'
                      : 'Retry this question'}
                  </button>
                )}

                <AnimatePresence>
                  {isOpen && !isUnattempted && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <QuestionDetail question={q} attemptId={attemptId} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

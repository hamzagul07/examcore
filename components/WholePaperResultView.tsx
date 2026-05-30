'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedScore } from '@/components/effects/AnimatedScore'
import { Progress } from '@/components/ui/Progress'
import { MarkdownMath } from '@/components/MarkdownMath'
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
      <p className="mb-4 text-xs text-slate-500">{subtitle}</p>
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
        <p className="mt-1 font-mono text-sm text-slate-400">{block.percentage}%</p>
      </div>
      {block.estimated_grade && (
        <p className="mt-3 text-sm font-semibold text-emerald-300">
          ~{block.estimated_grade}
        </p>
      )}
    </div>
  )
}

function QuestionInkSection({ question }: { question: QuestionMarkResult }) {
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
        animate={false}
      />
    </div>
  )
}

function QuestionDetail({ question }: { question: QuestionMarkResult }) {
  const ai = question.ai_marking

  if (question.marking_style === 'level_of_response' && ai.band_result) {
    return (
      <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm">
        <p className="font-semibold text-amber-200">
          Band {ai.band_result.level} — {ai.band_result.marks_awarded}/
          {ai.band_result.marks_available} marks
        </p>
        <MarkdownMath text={ai.band_result.justification} />
        {ai.band_result.strengths && ai.band_result.strengths.length > 0 && (
          <ul className="list-inside list-disc text-slate-400">
            {ai.band_result.strengths.map((s, i) => (
              <li key={i}>
                <MarkdownMath text={s} />
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  if (ai.mcq_breakdown && ai.mcq_breakdown.length > 0) {
    return (
      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        {ai.mcq_breakdown.map((row) => (
          <div
            key={row.question_number}
            className={`rounded-lg border p-3 text-sm ${
              row.correct
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-red-500/30 bg-red-500/10'
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
    <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
      <QuestionInkSection question={question} />
      {ai.marks_awarded && ai.marks_awarded.length > 0 && (
        <div className="space-y-2">
          {ai.marks_awarded.map((mark) => (
            <div
              key={String(mark.mark_id)}
              className={`rounded-xl border p-4 text-sm ${
                mark.earned
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-red-500/30 bg-red-500/10'
              }`}
            >
              <span className="font-mono text-xs font-bold">{mark.type}</span>
              <span
                className={`ml-2 text-xs ${mark.earned ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {mark.earned ? 'Earned' : 'Not earned'}
              </span>
              <div className="mt-2">
                <MarkdownMath text={mark.reasoning} />
              </div>
            </div>
          ))}
        </div>
      )}
      <MarkdownMath text={ai.summary} className="text-slate-300" />
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
          <p className="text-sm leading-relaxed text-slate-400">
            If you only completed some questions, here&apos;s what each score means:{' '}
            <strong className="text-slate-300">On what you attempted</strong> is
            your performance on questions you wrote;{' '}
            <strong className="text-slate-300">Full paper score</strong> treats
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
            <p className="mt-2 font-mono text-sm text-slate-400">
              {result.percentage}%
            </p>
          </div>
          {result.estimated_grade && (
            <p className="mt-4 text-lg font-semibold text-emerald-300">
              Estimated grade: {result.estimated_grade}
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {result.grade_note}
              </span>
            </p>
          )}
        </div>
      )}

      {result.paper_code && (
        <p className="text-center font-mono text-xs text-slate-500">
          {result.paper_code} · {result.paper_session}
        </p>
      )}

      <div className="ec-card p-6">
        <p className="ec-label-tech mb-3">SUMMARY</p>
        <MarkdownMath text={result.summary} className="text-slate-300" />
      </div>

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
                    ? 'border-white/5 bg-dark-900/20 opacity-60'
                    : isFailed
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-white/10 bg-dark-900/40'
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
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    )}
                    <span
                      className={`font-semibold ${isUnattempted ? 'text-slate-500' : 'text-white'}`}
                    >
                      Q{q.question_number}
                    </span>
                    {!isUnattempted && (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-500">
                        {q.marking_style.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-mono text-lg font-bold ${
                      isUnattempted
                        ? 'text-slate-600'
                        : isFailed
                          ? 'text-red-400'
                          : 'text-emerald-400'
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
                  <div className="mt-2 pl-6 text-sm text-slate-400">
                    <MarkdownMath text={q.summary} />
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
                      <QuestionDetail question={q} />
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

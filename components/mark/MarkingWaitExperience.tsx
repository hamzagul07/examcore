'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  friendlyStageLabel,
  markingTimeEstimateSubline,
  showAnticipationZone,
  stageSegmentPercent,
  type MarkContextPayload,
  type MarkProgressStage,
} from '@/lib/marking/mark-progress'
import { buildMarkingDisplayContext } from '@/lib/study-tips/display-context'
import { StageProgressBar } from './StageProgressBar'

type SingleProps = {
  mode: 'single'
  stage: MarkProgressStage
  context?: MarkContextPayload | null
  error?: string | null
}

type WholePaperProps = {
  mode: 'whole'
  phase: string
  message: string
  questionsCompleted: number
  questionsTotal: number
  paperCode: string
  paperSession: string
  context?: MarkContextPayload | null
  error?: string | null
}

export type MarkingWaitErrorActions = {
  onRetry?: () => void
  onBackToUpload?: () => void
  retryDisabled?: boolean
}

export type MarkingWaitExperienceProps = (SingleProps | WholePaperProps) &
  MarkingWaitErrorActions

function ScanningLines() {
  const lines = [
    'Scanning page structure…',
    'Reading lines of working…',
    'Capturing notation and layout…',
  ]
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % lines.length), 2200)
    return () => clearInterval(t)
  }, [lines.length])

  return (
    <motion.p
      key={lines[idx]}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="font-mono text-xs text-[var(--ec-text-secondary)]"
    >
      {lines[idx]}
    </motion.p>
  )
}

function AnticipationDots() {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-[2px]"
          style={{ background: 'var(--ec-brand)' }}
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.2, 0.85, 0.2] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function ContextBlock({
  display,
  paceLine,
  analyzingFallback,
}: {
  display: ReturnType<typeof buildMarkingDisplayContext>
  paceLine?: string | null
  analyzingFallback?: boolean
}) {
  const hasContent =
    paceLine || display.paperLine || display.topicLine || display.tipLine

  if (!hasContent && !analyzingFallback) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-3 border-t border-[var(--ec-border)] pt-6"
    >
      {paceLine && (
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ec-brand)]">
          {paceLine}
        </p>
      )}
      {display.paperLine && (
        <p className="text-sm font-medium leading-snug text-[var(--ec-text-primary)]">
          {display.paperLine}
        </p>
      )}
      {display.topicLine && (
        <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          <span className="font-mono text-xs uppercase tracking-wider opacity-70">
            Topic{' '}
          </span>
          {display.topicLine}
        </p>
      )}
      {display.tipLine && (
        <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          {display.tipLine}
        </p>
      )}
      {!display.paperLine && !display.topicLine && analyzingFallback && (
        <p className="text-sm text-[var(--ec-text-secondary)]">
          Analysing your question…
        </p>
      )}
    </motion.div>
  )
}

function MarkingStoppedCard({
  error,
  onRetry,
  onBackToUpload,
  retryDisabled,
}: {
  error: string
} & MarkingWaitErrorActions) {
  // Soft framing — never dump raw infra errors. Actionable client/OCR copy is
  // already softened by softNoticeForMarkFailure before it reaches here.
  const body =
    error.trim() ||
    "We couldn't finish marking this time. Your upload is still here — tap Mark again when you're ready."
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="ms-mark-wait ms-mark-wait--stopped"
      role="status"
    >
      <div className="ms-mark-wait__cap">
        <p className="ms-mark-wait__label">Still ready</p>
      </div>
      <h2 id="marking-wait-title" className="ms-mark-wait__headline" tabIndex={-1}>
        Let&apos;s try that again
      </h2>
      <p className="mt-3 text-base leading-relaxed text-[var(--ec-text-secondary)]">
        {body}
      </p>
      <span className="ms-mark-wait__note" aria-hidden>
        photos stay — try again or go back
      </span>
      {(onRetry || onBackToUpload) && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retryDisabled}
              className="ec-btn-primary inline-flex w-full items-center justify-center gap-2 text-sm sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
            >
              Try again
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </button>
          )}
          {onBackToUpload && (
            <button
              type="button"
              onClick={onBackToUpload}
              className="ec-btn-secondary w-full text-sm sm:w-auto"
            >
              Back to upload
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

export function MarkingWaitExperience(props: MarkingWaitExperienceProps) {
  if (props.error) {
    return (
      <MarkingStoppedCard
        error={props.error}
        onRetry={props.onRetry}
        onBackToUpload={props.onBackToUpload}
        retryDisabled={props.retryDisabled}
      />
    )
  }

  if (props.mode === 'whole') {
    return <WholePaperWait {...props} />
  }

  return <SingleQuestionWait {...props} />
}

function SingleQuestionWait({
  stage,
  context,
}: {
  stage: MarkProgressStage
  context?: MarkContextPayload | null
}) {
  const segment = stageSegmentPercent(stage)
  const headline = friendlyStageLabel(stage, {
    paperCode: context?.paper_code,
    questionNumber: context?.question_number ?? undefined,
  })
  const showScan = stage === 'reading_work'
  const showContext = stage !== 'reading_work'
  const showAnticipation = showAnticipationZone(stage)

  const display = useMemo(
    () =>
      buildMarkingDisplayContext({
        paper_code: context?.paper_code,
        paper_session: context?.paper_session,
        question_number: context?.question_number,
        syllabus_tags: context?.syllabus_tags,
      }),
    [context]
  )

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="ms-mark-wait"
      aria-busy="true"
    >
      {/* Stable live region — animated headline alone does not reliably announce (MK-02). */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {headline}.{' '}
        {markingTimeEstimateSubline(stage, {
          totalQuestions: context?.total_questions,
        })}
      </p>
      <div className="ms-mark-wait__cap">
        <p className="ms-mark-wait__label">Marking desk</p>
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          INK
        </span>
      </div>
      <StageProgressBar percent={segment} />
      <p className="ms-mark-wait__eta">
        {markingTimeEstimateSubline(stage, {
          totalQuestions: context?.total_questions,
        })}
      </p>

      <div className="mt-7 space-y-6">
        <div>
          <AnimatePresence mode="wait">
            <motion.h2
              key={headline}
              id="marking-wait-title"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="ms-mark-wait__headline"
              tabIndex={-1}
            >
              {headline}
            </motion.h2>
          </AnimatePresence>
          <span className="ms-mark-wait__note" aria-hidden>
            marks land on the line — hold on
          </span>
        </div>

        {context?.total_questions && context.total_questions > 1 ? (
          <p className="text-sm text-[var(--ec-text-secondary)]">
            Scanned script — marking{' '}
            <strong className="text-[var(--ec-text-primary)]">
              {context.total_questions} questions
            </strong>{' '}
            separately.
          </p>
        ) : null}

        <AnimatePresence mode="wait">
          {showScan && (
            <motion.div
              key="scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-[2.5rem]"
            >
              <ScanningLines />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showContext && (
            <ContextBlock
              display={display}
              analyzingFallback={!display.paperLine && !display.topicLine}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAnticipation && (
            <motion.div
              key="anticipation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-3 border-t border-[var(--ec-border)] pt-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm text-[var(--ec-text-secondary)]">
                Almost there — finishing your marks…
              </p>
              <AnticipationDots />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  )
}

function wholePhaseSegment(
  phase: string,
  questionsCompleted: number,
  questionsTotal: number
): number {
  if (phase === 'ocr' || phase === 'segmenting') return 18
  if (phase === 'marking' && questionsTotal > 0) {
    const base = 28
    const span = 58
    return base + Math.round((questionsCompleted / questionsTotal) * span)
  }
  if (phase === 'marking') return 45
  return 12
}

function WholePaperWait({
  phase,
  message,
  questionsCompleted,
  questionsTotal,
  paperCode,
  paperSession,
  context,
}: WholePaperProps) {
  const segment = wholePhaseSegment(phase, questionsCompleted, questionsTotal)
  const showScan = phase === 'ocr' || phase === 'segmenting'
  const showContext = phase === 'marking' || !!context?.syllabus_tags?.length
  const showAnticipation =
    phase === 'marking' &&
    questionsTotal > 0 &&
    questionsCompleted >= questionsTotal - 1

  const paceLine =
    phase === 'marking' && questionsTotal > 0
      ? `Marking question ${Math.min(questionsCompleted + 1, questionsTotal)} of ${questionsTotal}${
          context?.question_number ? ` · Q${context.question_number}` : ''
        }`
      : null

  const display = useMemo(
    () =>
      buildMarkingDisplayContext({
        paper_code: context?.paper_code ?? paperCode,
        paper_session: context?.paper_session ?? paperSession,
        question_number: context?.question_number,
        syllabus_tags: context?.syllabus_tags,
      }),
    [context, paperCode, paperSession]
  )

  const headline =
    phase === 'ocr' || phase === 'segmenting'
      ? 'Reading your handwriting…'
      : message || 'Marking your paper…'

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="ms-mark-wait"
      aria-busy="true"
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {headline}
        {paceLine ? `. ${paceLine}` : ''}
      </p>
      <div className="ms-mark-wait__cap">
        <p className="ms-mark-wait__label">Whole paper</p>
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          WP
        </span>
      </div>
      <StageProgressBar percent={segment} />

      <div className="mt-7 space-y-6">
        <div>
          <motion.h2
            key={headline}
            id="marking-wait-title"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="ms-mark-wait__headline"
            tabIndex={-1}
          >
            {headline}
          </motion.h2>
          <span className="ms-mark-wait__note" aria-hidden>
            one question at a time under the scheme
          </span>
        </div>

        {showScan && (
          <div className="min-h-[2.5rem]">
            <ScanningLines />
          </div>
        )}

        {showContext && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${context?.question_number ?? ''}-${display.primaryTag ?? ''}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ContextBlock display={display} paceLine={paceLine} />
            </motion.div>
          </AnimatePresence>
        )}

        {showAnticipation && (
          <div
            className="flex flex-col gap-3 border-t border-[var(--ec-border)] pt-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-[var(--ec-text-secondary)]">
              Placing examiner&apos;s marks on your answers…
            </p>
            <AnticipationDots />
          </div>
        )}
      </div>
    </motion.article>
  )
}

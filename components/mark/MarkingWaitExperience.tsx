'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  friendlyStageLabel,
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
      className="font-mono text-xs"
      style={{ color: 'var(--ec-text-secondary, #94a3b8)' }}
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
          className="h-1.5 w-1.5 rounded-full"
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
      className="space-y-3 border-t pt-6"
      style={{ borderColor: 'var(--ec-border, rgba(255,255,255,0.1))' }}
    >
      {paceLine && (
        <p
          className="font-mono text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: 'var(--ec-brand)' }}
        >
          {paceLine}
        </p>
      )}
      {display.paperLine && (
        <p
          className="text-sm font-medium leading-snug"
          style={{ color: 'var(--ec-text-primary, #f8fafc)' }}
        >
          {display.paperLine}
        </p>
      )}
      {display.topicLine && (
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--ec-text-secondary, #cbd5e1)' }}
        >
          <span className="font-mono text-xs uppercase tracking-wider opacity-70">
            Topic{' '}
          </span>
          {display.topicLine}
        </p>
      )}
      {display.tipLine && (
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--ec-text-secondary, #94a3b8)' }}
        >
          {display.tipLine}
        </p>
      )}
      {!display.paperLine && !display.topicLine && analyzingFallback && (
        <p
          className="text-sm"
          style={{ color: 'var(--ec-text-secondary, #94a3b8)' }}
        >
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="ec-card border-red-500/30 p-6 sm:p-8"
    >
      <p className="ec-label-tech mb-3 text-red-400/90">MARKING STOPPED</p>
      <p
        className="text-base leading-relaxed"
        style={{ color: 'var(--ec-text-primary, #f8fafc)' }}
      >
        {error}
      </p>
      {(onRetry || onBackToUpload) && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retryDisabled}
              className="ec-btn-primary w-full justify-center text-sm sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
            >
              Try again
            </button>
          )}
          {onBackToUpload && (
            <button
              type="button"
              onClick={onBackToUpload}
              className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition sm:w-auto"
              style={{
                borderColor: 'var(--ec-border)',
                color: 'var(--ec-text-secondary, #94a3b8)',
              }}
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
      className="ec-card overflow-hidden p-6 sm:p-8"
    >
      <StageProgressBar percent={segment} />

      <div className="mt-8 space-y-6">
        <div>
          <p className="ec-label-tech mb-3">MARKING</p>
          <AnimatePresence mode="wait">
            <motion.h2
              key={headline}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xl font-semibold tracking-tight sm:text-2xl"
              style={{ color: 'var(--ec-text-primary, #f8fafc)' }}
            >
              {headline}
            </motion.h2>
          </AnimatePresence>
        </div>

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
              className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderColor: 'var(--ec-border, rgba(255,255,255,0.1))' }}
            >
              <p
                className="text-sm"
                style={{ color: 'var(--ec-text-secondary, #94a3b8)' }}
              >
                Placing examiner&apos;s marks on your answer…
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
      className="ec-card overflow-hidden p-6 sm:p-8"
    >
      <StageProgressBar percent={segment} />

      <div className="mt-8 space-y-6">
        <div>
          <p className="ec-label-tech mb-3">WHOLE PAPER</p>
          <motion.h2
            key={headline}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ color: 'var(--ec-text-primary, #f8fafc)' }}
          >
            {headline}
          </motion.h2>
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
            className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: 'var(--ec-border, rgba(255,255,255,0.1))' }}
          >
            <p
              className="text-sm"
              style={{ color: 'var(--ec-text-secondary, #94a3b8)' }}
            >
              Placing examiner&apos;s marks on your answers…
            </p>
            <AnticipationDots />
          </div>
        )}
      </div>
    </motion.article>
  )
}

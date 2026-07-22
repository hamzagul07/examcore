'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion'
import {
  friendlyStageLabel,
  markingTimeEstimateSubline,
  stageSegmentPercent,
  type MarkContextPayload,
  type MarkProgressStage,
} from '@/lib/marking/mark-progress'
import { buildMarkingDisplayContext } from '@/lib/study-tips/display-context'
import type { LineReference } from '@/components/examiner-ink/ExaminerInkOverlay'
import { deriveSimulatedMarks } from '@/lib/marking/simulated-marks'
import {
  MarkingWaitExperience,
  type MarkingWaitErrorActions,
} from './MarkingWaitExperience'
import { StageProgressBar } from './StageProgressBar'
import { KineticField } from './cinematic/KineticField'
import { HandwritingAnalysisOverlay } from './cinematic/HandwritingAnalysisOverlay'
import { ExaminerHandReveal } from './cinematic/ExaminerHandReveal'
import { useCinematicPhases } from './cinematic/useCinematicPhases'
import type { CinematicPhase } from './cinematic/types'

export type CinematicMarkingExperienceProps = {
  stage: MarkProgressStage
  context?: MarkContextPayload | null
  /** Object URL of the student's first uploaded page (instant, no network). */
  imageUrl: string | null
  /** True once the final SSE result payload has arrived. */
  resultReady: boolean
  /** Real Gemini-positioned marks, when the result is already in. */
  lineReferences?: LineReference[] | null
  /** Called once the cinematic is ready to hand off to the real results page. */
  onReveal: () => void
  error?: string | null
} & MarkingWaitErrorActions

const READING_MS = 3800

export function CinematicMarkingExperience(
  props: CinematicMarkingExperienceProps
) {
  const {
    stage,
    context,
    imageUrl,
    resultReady,
    lineReferences,
    onReveal,
    error,
  } = props

  const prefersReduced = useReducedMotion()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Full motion only when we have an image and motion is allowed. The hook is
  // always called (rules of hooks); `enabled` gates its timers.
  const useFullMotion = !prefersReduced && !!imageUrl && !error
  const { phase, intensity, notifyClimaxDone } = useCinematicPhases({
    stage,
    resultReady,
    enabled: useFullMotion,
    readingMs: READING_MS,
  })

  const marks = useMemo(
    () => deriveSimulatedMarks(lineReferences),
    [lineReferences]
  )

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

  // Reveal exactly once.
  const revealedRef = useRef(false)
  const onRevealRef = useRef(onReveal)
  onRevealRef.current = onReveal
  const fireReveal = () => {
    if (revealedRef.current) return
    revealedRef.current = true
    onRevealRef.current()
  }

  // Reduced-motion path reveals as soon as the result is ready.
  useEffect(() => {
    if (!useFullMotion && resultReady) fireReveal()
  }, [useFullMotion, resultReady])

  // Cinematic path reveals when the machine reaches its terminal phase.
  useEffect(() => {
    if (phase === 'reveal') fireReveal()
  }, [phase])

  // --- Fallbacks (must come after all hooks) ---
  if (error) {
    return (
      <MarkingWaitExperience
        mode="single"
        stage={stage}
        error={error}
        onRetry={props.onRetry}
        onBackToUpload={props.onBackToUpload}
        retryDisabled={props.retryDisabled}
      />
    )
  }

  if (!useFullMotion) {
    // Reduced-motion (and the safety case of no image): Sprint 45 verbatim.
    return (
      <MarkingWaitExperience mode="single" stage={stage} context={context} />
    )
  }

  const percent = phasePercent(phase, stage)
  const anticipating =
    phase === 'buildup' || phase === 'climax' || phase === 'reveal'
  const stageText = anticipating
    ? 'Almost there — finishing your marks…'
    : friendlyStageLabel(stage, {
        paperCode: context?.paper_code,
        questionNumber: context?.question_number ?? undefined,
      })

  const stageScale =
    phase === 'buildup' || phase === 'climax' || phase === 'reveal' ? 1.04 : 1
  const fieldOpacity = phase === 'climax' || phase === 'reveal' ? 0 : 1

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="ec-card ec-cinematic-card relative overflow-hidden p-4 sm:p-6 md:p-8"
    >
      {/* A — kinetic field, full bleed behind everything */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: fieldOpacity }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <KineticField intensity={intensity} reducedParticles={isMobile} />
      </motion.div>

      <div className="relative z-10">
        <StageProgressBar percent={percent} />
        <p className="mt-3 text-center text-xs text-[var(--ec-text-secondary)]">
          {markingTimeEstimateSubline(anticipating ? null : stage, {
            totalQuestions: context?.total_questions,
          })}
        </p>

        <div className="mt-6 space-y-1.5">
          <p className="ec-label-tech">MARKING</p>
          {display.paperLine && (
            <p className="text-sm font-medium leading-snug ec-text-primary">
              {display.paperLine}
            </p>
          )}
          {display.topicLine && (
            <p className="text-sm leading-relaxed ec-text-secondary">
              <span className="font-mono text-xs uppercase tracking-wider opacity-70">
                Topic{' '}
              </span>
              {display.topicLine}
            </p>
          )}
        </div>

        <div className="mt-7 flex flex-col items-center gap-7 md:flex-row md:items-center md:gap-8">
          {/* The student's image — the canvas everything builds around. */}
          <motion.div
            className="w-full md:flex-1"
            animate={{ scale: stageScale }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          >
            <ImageStage
              phase={phase}
              imageUrl={imageUrl!}
              marks={marks}
              simplified={isMobile}
              onClimaxDone={notifyClimaxDone}
            />
          </motion.div>

          {/* Stage narration */}
          <div className="w-full md:w-[40%]">
            <AnimatePresence mode="wait">
              <motion.p
                key={stageText}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-lg font-semibold leading-snug tracking-tight sm:text-xl ec-text-primary"
              >
                {stageText}
              </motion.p>
            </AnimatePresence>
            {anticipating && <SurgeDots />}
          </div>
        </div>

        {display.tipLine && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-7 border-t ec-border-color pt-5"
          >
            <p className="text-sm leading-relaxed ec-text-secondary">
              <span className="font-mono text-xs uppercase tracking-wider opacity-70">
                Tip{' '}
              </span>
              {display.tipLine}
            </p>
          </motion.div>
        )}
      </div>
    </motion.article>
  )
}

function ImageStage({
  phase,
  imageUrl,
  marks,
  simplified,
  onClimaxDone,
}: {
  phase: CinematicPhase
  imageUrl: string
  marks: ReturnType<typeof deriveSimulatedMarks>
  simplified: boolean
  onClimaxDone: () => void
}) {
  const showReading = phase === 'transform' || phase === 'reading'
  const showClimax = phase === 'climax' || phase === 'reveal'

  return (
    <AnimatePresence mode="wait">
      {showReading ? (
        <motion.div
          key="reading"
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          <HandwritingAnalysisOverlay
            imageUrl={imageUrl}
            durationMs={READING_MS}
            simplified={simplified}
          />
        </motion.div>
      ) : showClimax ? (
        <motion.div
          key="climax"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ExaminerHandReveal
            imageUrl={imageUrl}
            marks={marks}
            simplified={simplified}
            onComplete={onClimaxDone}
          />
        </motion.div>
      ) : (
        <motion.div
          key="analyzing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.82 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border ec-border-color ec-shadow-elevation-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- continuity with the overlay components; same cached src. */}
          <img
            src={imageUrl}
            alt="Your handwritten answer"
            className="block h-auto w-full"
            style={{ maxHeight: '58vh', objectFit: 'contain' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SurgeDots() {
  return (
    <div className="mt-3 flex items-center gap-2" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--ec-brand)]"
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.12,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// Floors keep the bar from starting near-empty and from dropping when a phase
// advances ahead of the server's stage. They must stay BELOW the stage values
// they gate, or they mask them: the old `analyzing` floor of 70 sat above every
// real stage (25/35/48/62), pinning the bar at exactly 70% for the entire
// 100–170s derive→mark→verify stretch — the frozen bar this was meant to fix.
function phasePercent(phase: CinematicPhase, stage: MarkProgressStage): number {
  switch (phase) {
    case 'transform':
    case 'reading':
      return Math.max(10, stageSegmentPercent(stage))
    case 'analyzing':
      // Floor sits just above where `reading` can leave off, so the handover is
      // monotonic while every later stage still drives the bar.
      return Math.max(25, stageSegmentPercent(stage))
    case 'buildup':
      return 92
    case 'climax':
      return 97
    case 'reveal':
      return 100
    default:
      return stageSegmentPercent(stage)
  }
}

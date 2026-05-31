'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { SimulatedMark } from './types'

/**
 * Subagent C — the examiner's hand reveal (the climax).
 *
 * 3-5 red-ink strokes draw themselves onto the student's image via Framer
 * Motion `pathLength`, staggered like a hand working down the page: a tick, an
 * underline, a margin curl, and a handwritten M1/B1 note. When the real result
 * is already in, the orchestrator feeds positions derived from the real bboxes,
 * so these strokes sit where the real overlay's ink will land — the dissolve
 * into ExaminerInkOverlay is then near-seamless.
 */

const STROKE_DRAW = 0.6 // seconds per stroke
const STROKE_STAGGER = 0.42 // seconds between stroke starts
const HOLD_AFTER = 0.55 // seconds to rest on the finished page before reveal

const INK = 'var(--ec-ink-crimson)'

// Hand-feel primitives in a 0-100 viewBox.
const TICK_PATH = 'M16 54 L40 80 L86 20'
const UNDERLINE_PATH = 'M2 12 C26 4 52 18 74 9 C84 5 92 11 98 8'
const CURL_PATH = 'M22 34 C58 10 84 44 56 68 C36 84 20 58 38 48'

function inkShadow(strength = 0.4) {
  return `drop-shadow(0 1px 2px color-mix(in srgb, var(--ec-ink-crimson) ${Math.round(
    strength * 100
  )}%, transparent))`
}

export function ExaminerHandReveal({
  imageUrl,
  marks,
  simplified = false,
  onComplete,
}: {
  imageUrl: string
  marks: SimulatedMark[]
  /** Mobile: same strokes, no extra flourish. */
  simplified?: boolean
  onComplete?: () => void
}) {
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  useEffect(() => {
    const total =
      (marks.length - 1) * STROKE_STAGGER + STROKE_DRAW + HOLD_AFTER
    const t = setTimeout(() => completeRef.current?.(), total * 1000)
    return () => clearTimeout(t)
  }, [marks.length])

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-2xl"
      style={{
        maxWidth: 520,
        border: '1px solid var(--ec-border)',
        boxShadow:
          '0 24px 64px -16px rgba(0,0,0,0.55), 0 0 40px color-mix(in srgb, var(--ec-ink-crimson) 16%, transparent)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- unknown dims; percentage overlay math needs the natural box. */}
      <img
        src={imageUrl}
        alt="Your handwritten answer being marked"
        className="block h-auto w-full"
        style={{ maxHeight: '58vh', objectFit: 'contain' }}
      />

      <div className="pointer-events-none absolute inset-0">
        {marks.map((mark, i) => {
          const delay = i * STROKE_STAGGER
          return (
            <Stroke key={mark.id} mark={mark} delay={delay} simplified={simplified} />
          )
        })}
      </div>
    </div>
  )
}

function Stroke({
  mark,
  delay,
  simplified,
}: {
  mark: SimulatedMark
  delay: number
  simplified: boolean
}) {
  const drawTransition = {
    duration: STROKE_DRAW,
    delay,
    ease: [0.4, 0, 0.2, 1] as const,
  }

  if (mark.kind === 'note') {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: -8 }}
        transition={{ duration: 0.35, delay, ease: 'backOut' }}
        className="absolute font-semibold"
        style={{
          left: `${mark.xPct}%`,
          top: `${mark.yPct}%`,
          transform: 'translate(-50%, -50%)',
          color: INK,
          fontFamily: 'var(--ec-font-handwriting)',
          fontSize: 'clamp(18px, 3.5vw, 26px)',
          textShadow: '0 1px 2px color-mix(in srgb, var(--ec-ink-crimson) 35%, transparent)',
        }}
      >
        {mark.text}
      </motion.span>
    )
  }

  if (mark.kind === 'underline') {
    return (
      <motion.svg
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        className="absolute"
        style={{
          left: `${mark.xPct}%`,
          top: `${mark.yPct}%`,
          width: `${mark.widthPct}%`,
          height: '4%',
          overflow: 'visible',
        }}
      >
        <motion.path
          d={UNDERLINE_PATH}
          fill="none"
          stroke={INK}
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.85 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={drawTransition}
          style={{ filter: inkShadow(0.45) }}
        />
      </motion.svg>
    )
  }

  // tick + curl share a square viewBox.
  const isTick = mark.kind === 'tick'
  const size = mark.sizePct ?? 11
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="absolute"
      style={{
        left: `${mark.xPct}%`,
        top: `${mark.yPct}%`,
        width: `${size}%`,
        height: `${size}%`,
        transform: `translate(-50%, -50%) rotate(${isTick ? -6 : 4}deg)`,
        overflow: 'visible',
      }}
    >
      <motion.path
        d={isTick ? TICK_PATH : CURL_PATH}
        fill="none"
        stroke={INK}
        strokeWidth={isTick ? 9 : 5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={drawTransition}
        style={{ filter: inkShadow(simplified ? 0.3 : 0.5) }}
      />
    </motion.svg>
  )
}

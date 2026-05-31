'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * Subagent B — the handwriting analysis overlay.
 *
 * The student's own image is the canvas. A soft gradient band sweeps top to
 * bottom like an examiner reading line by line; horizontal highlight bands
 * pulse as each "line" is passed; and 2-3 hand-drawn circles draw themselves
 * around what would be key terms, then fade.
 *
 * Restraint by design: no sci-fi grid, no matrix characters, no "ANALYSING…"
 * text. Positions are simulated (they need not map to real OCR for this phase).
 */

// A deliberately imperfect circle — a single cubic loop with slight wobble so
// it reads as hand-drawn rather than a vector-perfect ring. Drawn in a 0-100
// viewBox; scaled to each circle's footprint.
const WOBBLE_CIRCLE =
  'M50 8 C74 6 95 26 92 51 C90 76 70 95 47 92 C23 90 6 69 9 45 C11 24 28 10 50 8'

type Highlight = { id: number; topPct: number }
type Circle = { id: number; xPct: number; yPct: number; sizePct: number }

export function HandwritingAnalysisOverlay({
  imageUrl,
  durationMs = 3800,
  lineCount = 6,
  simplified = false,
  onSweepComplete,
}: {
  imageUrl: string
  durationMs?: number
  /** Number of simulated handwriting lines to pulse during the read. */
  lineCount?: number
  /** Mobile: gradient sweep only, no per-line bands or circles. */
  simplified?: boolean
  onSweepComplete?: () => void
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const completeRef = useRef(onSweepComplete)
  completeRef.current = onSweepComplete

  // Pre-plan circle footprints once (stable across renders).
  const plannedCircles = useMemo<Circle[]>(() => {
    if (simplified) return []
    return [
      { id: 1, xPct: 22, yPct: 30, sizePct: 16 },
      { id: 2, xPct: 64, yPct: 52, sizePct: 13 },
      { id: 3, xPct: 38, yPct: 72, sizePct: 15 },
    ]
  }, [simplified])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    if (!simplified) {
      // Pulse each "line" as the sweep crosses it.
      for (let i = 0; i < lineCount; i++) {
        const at = (durationMs * (i + 0.5)) / lineCount
        const topPct = ((i + 0.5) / lineCount) * 100
        const id = 1000 + i
        timers.push(
          setTimeout(() => {
            setHighlights((prev) => [...prev, { id, topPct }])
            timers.push(
              setTimeout(
                () => setHighlights((prev) => prev.filter((h) => h.id !== id)),
                600
              )
            )
          }, at)
        )
      }

      // Draw 2-3 circles spread across the read, each fading after a beat.
      plannedCircles.forEach((c, idx) => {
        const at = durationMs * (0.25 + idx * 0.24)
        timers.push(
          setTimeout(() => {
            setCircles((prev) => [...prev, c])
            timers.push(
              setTimeout(
                () => setCircles((prev) => prev.filter((x) => x.id !== c.id)),
                1400
              )
            )
          }, at)
        )
      })
    }

    timers.push(setTimeout(() => completeRef.current?.(), durationMs))

    return () => timers.forEach(clearTimeout)
  }, [durationMs, lineCount, simplified, plannedCircles])

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-2xl"
      style={{
        maxWidth: 520,
        border: '1px solid color-mix(in srgb, var(--ec-brand) 35%, transparent)',
        boxShadow:
          '0 24px 64px -16px rgba(0,0,0,0.55), 0 0 48px color-mix(in srgb, var(--ec-brand) 20%, transparent)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- unknown dims; percentage overlay math needs the natural box. */}
      <img
        src={imageUrl}
        alt="Your handwritten answer being read"
        onLoad={() => setImageLoaded(true)}
        className="block h-auto w-full"
        style={{ maxHeight: '58vh', objectFit: 'contain' }}
      />

      <div className="pointer-events-none absolute inset-0">
        {/* Line highlight bands */}
        <AnimatePresence>
          {highlights.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute left-0 right-0"
              style={{
                top: `${h.topPct}%`,
                height: '5.5%',
                transform: 'translateY(-50%)',
                background:
                  'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--ec-brand) 22%, transparent) 18%, color-mix(in srgb, var(--ec-brand) 22%, transparent) 82%, transparent 100%)',
              }}
            />
          ))}
        </AnimatePresence>

        {/* Hand-drawn circles around "key terms" */}
        <AnimatePresence>
          {circles.map((c) => (
            <motion.svg
              key={c.id}
              viewBox="0 0 100 100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute"
              style={{
                left: `${c.xPct}%`,
                top: `${c.yPct}%`,
                width: `${c.sizePct}%`,
                height: `${c.sizePct * 0.8}%`,
                transform: 'translate(-50%, -50%) rotate(-4deg)',
                overflow: 'visible',
              }}
            >
              <motion.path
                d={WOBBLE_CIRCLE}
                fill="none"
                stroke="var(--ec-brand)"
                strokeWidth={3.2}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                style={{
                  filter:
                    'drop-shadow(0 0 6px color-mix(in srgb, var(--ec-brand) 45%, transparent))',
                }}
              />
            </motion.svg>
          ))}
        </AnimatePresence>

        {/* The reading sweep: a soft bright band travelling top → bottom. */}
        {imageLoaded && (
          <motion.div
            initial={{ top: '-12%' }}
            animate={{ top: '108%' }}
            transition={{ duration: durationMs / 1000, ease: 'linear' }}
            className="absolute left-0 right-0"
            style={{
              height: '14%',
              background:
                'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--ec-brand) 30%, transparent) 45%, color-mix(in srgb, var(--ec-brand) 55%, transparent) 50%, color-mix(in srgb, var(--ec-brand) 30%, transparent) 55%, transparent 100%)',
              filter: 'blur(2px)',
            }}
          />
        )}
      </div>
    </div>
  )
}

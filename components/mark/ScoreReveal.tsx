'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The score, as the moment it actually is.
 *
 * This is the emotional peak of the product and it was a line of text —
 * "4 / 5 — one mark got away." A student who has just waited a minute and a half
 * deserves the result to land.
 *
 * Form follows the data's job (dataviz method): a single ratio against a limit
 * is a METER, and the one number the view leads with is a HERO FIGURE — not a
 * chart. So: one ring meter, one hero number inside it, and a pip per mark
 * point so the breakdown is visible at a glance rather than read as prose.
 *
 * Colour is never the only channel — the band is named in text, the pips differ
 * in fill AND shape, and the whole thing carries an aria-label that states the
 * score in words. The track is a lighter step of the fill's own ramp rather than
 * a neutral gray, so the state reads across the entire ring.
 */

type Band = 'high' | 'mid' | 'low'

function bandFor(pct: number): Band {
  if (pct >= 80) return 'high'
  if (pct >= 50) return 'mid'
  return 'low'
}

/** Reserved status tokens — deliberately the same ones the rest of the app uses
 * for success/warning/critical, so a colour never means two different things. */
const BAND_INK: Record<Band, string> = {
  high: 'var(--ec-chip-success-text, #19774d)',
  mid: 'var(--ec-chip-warning-text, #735829)',
  low: 'var(--ec-chip-critical-text, #a23e3e)',
}

function bandLabel(pct: number, earned: number, total: number): string {
  if (total > 0 && earned >= total) return 'Full marks'
  switch (bandFor(pct)) {
    case 'high':
      return 'Strong'
    case 'mid':
      return 'Nearly there'
    default:
      return 'Room to grow'
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Ease-out count-up. Returns the final value immediately when motion is reduced. */
function useCountUp(target: number, durationMs: number, enabled: boolean): number {
  const [value, setValue] = useState(enabled ? 0 : target)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current)
    }
  }, [target, durationMs, enabled])

  return value
}

export type ScoreRevealMark = {
  id: string
  earned: boolean
  label: string
}

export function ScoreReveal({
  marksEarned,
  totalMarks,
  percentage,
  grade,
  nextGrade,
  marks = [],
  onSelectMark,
}: {
  marksEarned: number
  totalMarks: number
  percentage: number
  grade?: string | null
  /** Cambridge only — suppressed for IB, which has no letter-grade estimate. */
  nextGrade?: { marksNeeded: number; nextGrade: string } | null
  marks?: ScoreRevealMark[]
  onSelectMark?: (id: string) => void
}) {
  const reduced = usePrefersReducedMotion()
  const animate = !reduced
  const pct = Math.max(0, Math.min(100, percentage))
  const band = bandFor(pct)
  const ink = BAND_INK[band]
  const label = bandLabel(pct, marksEarned, totalMarks)

  const shownMarks = useCountUp(marksEarned, 900, animate)
  const [swept, setSwept] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    // Next frame, so the ring transitions from empty rather than starting full.
    const id = requestAnimationFrame(() => setSwept(true))
    return () => cancelAnimationFrame(id)
  }, [animate])

  const R = 52
  const CIRC = 2 * Math.PI * R
  const offset = CIRC * (1 - (swept ? pct : 0) / 100)

  return (
    <div className="ms-score-reveal">
      <div className="ms-score-reveal__main">
        <div
          className="ms-score-ring"
          role="img"
          aria-label={`You scored ${marksEarned} out of ${totalMarks}${
            totalMarks > 0 ? `, ${pct}%` : ''
          }. ${label}.${grade ? ` Predicted grade ${grade}.` : ''}`}
        >
          <svg viewBox="0 0 120 120" aria-hidden="true">
            {/* Track: a lighter step of the fill's own ramp, not a neutral gray,
                so the band reads across the whole ring. */}
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              strokeWidth="10"
              stroke={`color-mix(in srgb, ${ink} 18%, var(--ec-surface, #fff))`}
            />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              stroke={ink}
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
              style={{
                transition: animate
                  ? 'stroke-dashoffset 1100ms cubic-bezier(0.22, 1, 0.36, 1)'
                  : undefined,
              }}
            />
          </svg>
          <div className="ms-score-ring__value">
            {/* Hero figure — exactly one per view. Proportional figures: at this
                size tabular-nums makes the number look loose. */}
            <span className="ms-score-ring__earned" style={{ color: ink }}>
              {Math.round(shownMarks)}
            </span>
            <span className="ms-score-ring__total">/ {totalMarks}</span>
          </div>
        </div>

        <div className="ms-score-reveal__meta">
          <p className="ms-score-reveal__band" style={{ color: ink }}>
            {label}
          </p>
          <p className="ms-score-reveal__pct">
            {pct}%{grade ? ` · predicted ${grade}` : ''}
          </p>
          {nextGrade && nextGrade.marksNeeded > 0 && (
            <p className="ms-score-reveal__next">
              <strong>
                {nextGrade.marksNeeded} mark
                {nextGrade.marksNeeded === 1 ? '' : 's'}
              </strong>{' '}
              from {/^[AEIOU]/.test(nextGrade.nextGrade) ? 'an' : 'a'}{' '}
              {nextGrade.nextGrade}
            </p>
          )}
        </div>
      </div>

      {marks.length > 0 && (
        <ul className="ms-score-pips" aria-label="Mark by mark">
          {marks.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onSelectMark?.(m.id)}
                className={`ms-score-pip ${m.earned ? 'is-earned' : 'is-lost'}`}
                style={{
                  // Stagger so the breakdown resolves after the ring, not with it.
                  transitionDelay: animate ? `${420 + i * 70}ms` : undefined,
                  ...(swept ? { opacity: 1, transform: 'none' } : {}),
                }}
                title={`${m.label} — ${m.earned ? 'earned' : 'not earned'}`}
              >
                {/* Shape carries the state as well as colour: a solid disc for
                    earned, a hollow ring for lost. */}
                <span aria-hidden="true" className="ms-score-pip__dot" />
                <span className="sr-only">
                  {m.label} {m.earned ? 'earned' : 'not earned'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

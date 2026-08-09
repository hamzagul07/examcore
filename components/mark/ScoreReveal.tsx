'use client'

import { useEffect, useRef, useState } from 'react'
import {
  buildParentScoreSlipText,
  openParentScoreSlip,
  shareParentScoreSlipNative,
  shareParentScoreSlipWhatsApp,
} from '@/lib/marking/parent-score-slip'

/**
 * The score, as the moment it actually is.
 *
 * Emotional peak of the product — an examiner’s tally slip, not a fitness ring.
 * Hero figure = earned / total on ruled paper; pips = tick / cross stamps;
 * next-grade as a margin note. Colour never the only channel: band named in
 * text, stamps differ in fill AND glyph, aria-label states the score in words.
 */

type Band = 'high' | 'mid' | 'low'

function bandFor(pct: number): Band {
  if (pct >= 80) return 'high'
  if (pct >= 50) return 'mid'
  return 'low'
}

/** Dual-ink: green awarded, amber caution, crimson correction. */
const BAND_INK: Record<Band, string> = {
  high: 'var(--ec-ink, var(--ec-brand, #19774d))',
  mid: 'var(--ec-chip-warning-text, #735829)',
  low: 'var(--ec-ink-crimson, var(--ec-chip-critical-text, #bb2a25))',
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
  reason?: string | null
}

export type ScoreRevealReport = {
  subjectLabel?: string | null
  paperRef?: string | null
  topics?: string[]
}

export function ScoreReveal({
  marksEarned,
  totalMarks,
  percentage,
  grade,
  nextGrade,
  marks = [],
  onSelectMark,
  activeMarkId = null,
  shareable = true,
  report,
}: {
  marksEarned: number
  totalMarks: number
  percentage: number
  grade?: string | null
  /** Cambridge only — suppressed for IB, which has no letter-grade estimate. */
  nextGrade?: { marksNeeded: number; nextGrade: string } | null
  marks?: ScoreRevealMark[]
  onSelectMark?: (id: string) => void
  /** Currently inspected mark — radiogroup selection (MK-07 / A11Y-01). */
  activeMarkId?: string | null
  /** Show copy/print parent slip — on for real results, off for demos/previews. */
  shareable?: boolean
  /** Extra context for the parent/tutor artefact. */
  report?: ScoreRevealReport
}) {
  const reduced = usePrefersReducedMotion()
  const animate = !reduced
  const pct = Math.max(0, Math.min(100, percentage))
  const band = bandFor(pct)
  const ink = BAND_INK[band]
  const label = bandLabel(pct, marksEarned, totalMarks)
  const [copied, setCopied] = useState(false)
  const fullMarks = totalMarks > 0 && marksEarned >= totalMarks
  const stampText = grade?.trim() || (fullMarks ? 'DONE' : label === 'Strong' ? 'OK' : 'MARK')

  const shownMarks = useCountUp(marksEarned, 900, animate)
  const [settled, setSettled] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const id = requestAnimationFrame(() => setSettled(true))
    return () => cancelAnimationFrame(id)
  }, [animate])

  function slipInput() {
    return {
      marksEarned,
      totalMarks,
      percentage: pct,
      bandLabel: label,
      grade,
      nextGrade,
      subjectLabel: report?.subjectLabel,
      paperRef: report?.paperRef,
      topics: report?.topics,
      marks: marks.map((m) => ({
        label: m.label,
        earned: m.earned,
        reason: m.reason,
      })),
    }
  }

  async function copySlip() {
    const text = buildParentScoreSlipText(slipInput())
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  function printSlip() {
    openParentScoreSlip(slipInput())
  }

  function whatsappSlip() {
    shareParentScoreSlipWhatsApp(slipInput())
  }

  async function nativeShareSlip() {
    const ok = await shareParentScoreSlipNative(slipInput())
    if (!ok) shareParentScoreSlipWhatsApp(slipInput())
  }

  const paperRef = report?.paperRef?.trim()

  return (
    <div className="ms-score-reveal" style={{ ['--ms-score-ink' as string]: ink }}>
      <div className="ms-score-reveal__main">
        <div
          className={`ms-score-tally${settled ? ' is-settled' : ''}`}
          role="img"
          aria-label={`You scored ${marksEarned} out of ${totalMarks}${
            totalMarks > 0 ? `, ${pct}%` : ''
          }. ${label}.${grade ? ` Predicted grade ${grade}.` : ''}`}
        >
          <div className="ms-score-tally__head">
            <span className="ms-score-tally__kicker">
              {paperRef ? paperRef : 'MARKED'}
            </span>
            <span className="ms-score-tally__stamp" aria-hidden>
              {stampText}
            </span>
          </div>
          <div className="ms-score-tally__figure">
            <span className="ms-score-tally__earned">{Math.round(shownMarks)}</span>
            <span className="ms-score-tally__slash" aria-hidden>
              /
            </span>
            <span className="ms-score-tally__total">{totalMarks}</span>
          </div>
          <span className="ms-score-tally__pct">{pct}%</span>
        </div>

        <div className="ms-score-reveal__meta">
          <p className="ms-score-reveal__band">{label}</p>
          <p className="ms-score-reveal__pct">
            {pct}%{grade ? ` · predicted ${grade}` : ''}
          </p>
          {nextGrade && nextGrade.marksNeeded > 0 && (
            <p className="ms-score-reveal__next">
              <span className="ms-score-reveal__next-ink" aria-hidden>
                note
              </span>
              <strong>
                {nextGrade.marksNeeded} mark
                {nextGrade.marksNeeded === 1 ? '' : 's'}
              </strong>{' '}
              from {/^[AEIOU]/.test(nextGrade.nextGrade) ? 'an' : 'a'}{' '}
              {nextGrade.nextGrade}
            </p>
          )}
          {shareable && (
            <div className="ms-score-reveal__actions">
              <button
                type="button"
                className={`ms-score-reveal__share${copied ? ' is-copied' : ''}`}
                onClick={() => void copySlip()}
              >
                <span aria-hidden>{copied ? 'OK' : 'CP'}</span>
                {copied ? 'Slip copied' : 'Copy slip'}
              </button>
              <button type="button" className="ms-score-reveal__share" onClick={printSlip}>
                <span aria-hidden>PR</span>
                Parent report
              </button>
              <button
                type="button"
                className="ms-score-reveal__share"
                onClick={() => void nativeShareSlip()}
              >
                <span aria-hidden>SH</span>
                Share
              </button>
              <button type="button" className="ms-score-reveal__share" onClick={whatsappSlip}>
                <span aria-hidden>WA</span>
                WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      {marks.length > 0 && (
        <ul
          className="ms-score-pips"
          role="radiogroup"
          aria-label="Mark by mark"
        >
          {marks.map((m, i) => {
            const checked = activeMarkId != null && activeMarkId === m.id
            return (
              <li key={m.id} role="none">
                <button
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => onSelectMark?.(m.id)}
                  className={`ms-score-pip ${m.earned ? 'is-earned' : 'is-lost'}${
                    checked ? ' is-active' : ''
                  }`}
                  style={{
                    transitionDelay: animate ? `${280 + i * 60}ms` : undefined,
                    ...(settled ? { opacity: 1, transform: 'none' } : {}),
                  }}
                  title={`${m.label} — ${m.earned ? 'earned' : 'not earned'}`}
                >
                  <span aria-hidden="true" className="ms-score-pip__stamp">
                    {m.earned ? 'M' : 'X'}
                  </span>
                  <span className="sr-only">
                    {m.label} {m.earned ? 'earned' : 'not earned'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

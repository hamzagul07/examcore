'use client'

import { useState } from 'react'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import type { IbCriterionResult } from '@/lib/marking/types'

/**
 * IB criteria, as a strip you can read at a glance rather than a tall stack.
 *
 * The old layout rendered every criterion as a full-width card with its band
 * descriptor and justification, stacked vertically — five criteria meant a long
 * scroll before you could even see how you did on the last one. IB work has 4–5
 * criteria of different maximums (A /6, B /4 …), and the thing a student wants
 * first is the SHAPE: which criteria are strong, which cost them marks.
 *
 * So: a compact tile per criterion, all visible together and fitting the
 * screen, each a small meter of marks-against-max. Picking one shows its
 * reasoning below — the weakest is selected by default, since that is the one
 * worth reading first. Same select-to-reveal pattern as the mark list.
 *
 * The meter colour is the reserved status palette (weak / mid / strong), and the
 * ratio is also printed, so the state never rides on colour alone.
 */

type Band = 'low' | 'mid' | 'high'

function bandOf(awarded: number, available: number): Band {
  if (available <= 0) return 'mid'
  const pct = (awarded / available) * 100
  if (pct >= 80) return 'high'
  if (pct >= 50) return 'mid'
  return 'low'
}

const BAND_TOKEN: Record<Band, string> = {
  high: 'success',
  mid: 'warning',
  low: 'critical',
}

export function IbCriteriaBreakdown({
  criteria,
}: {
  criteria: IbCriterionResult[]
}) {
  // Weakest first pick for the default detail — the mark most worth acting on.
  const weakestIdx = criteria.reduce((worst, c, i, arr) => {
    const r = (x: IbCriterionResult) =>
      x.marks_available > 0 ? x.marks_awarded / x.marks_available : 1
    return r(c) < r(arr[worst]) ? i : worst
  }, 0)
  const [selected, setSelected] = useState(weakestIdx)
  const active = criteria[selected]

  return (
    <div className="ms-ib-criteria">
      <p className="ms-overline" style={{ marginBottom: 10 }}>
        IB criteria breakdown
      </p>

      <ul
        className="ms-ibc-strip"
        aria-label="Criteria — tap one for the examiner's reasoning"
      >
        {criteria.map((c, i) => {
          const band = bandOf(c.marks_awarded, c.marks_available)
          const fill =
            c.marks_available > 0
              ? Math.max(6, (c.marks_awarded / c.marks_available) * 100)
              : 0
          return (
            <li key={c.criterion}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={i === selected}
                className={`ms-ibc-tile ${i === selected ? 'is-active' : ''}`}
                data-level={BAND_TOKEN[band]}
                title={`${c.criterion} — ${c.criterion_name}`}
              >
                <span className="ms-ibc-tile__crit">{c.criterion}</span>
                <span className="ms-ibc-tile__track" aria-hidden="true">
                  <span
                    className="ms-ibc-tile__fill"
                    style={{ height: `${fill}%` }}
                  />
                </span>
                <span className="ms-ibc-tile__marks">
                  {c.marks_awarded}
                  <span className="ms-ibc-tile__max">/{c.marks_available}</span>
                </span>
                <span className="ms-ibc-tile__name">{c.criterion_name}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {active && (
        <div className="ms-ibc-detail" aria-live="polite">
          <div className="ms-ibc-detail__head">
            <span className="ms-ibc-detail__crit">
              {active.criterion} — {active.criterion_name}
            </span>
            <span className="ms-grade-pill">
              {active.marks_awarded}/{active.marks_available} · L{active.level}
            </span>
          </div>
          <p className="ms-ibc-detail__band">{active.band_descriptor}</p>
          <div className="ms-ibc-detail__why">
            <RichTextRenderer text={active.justification} />
          </div>
        </div>
      )}
    </div>
  )
}

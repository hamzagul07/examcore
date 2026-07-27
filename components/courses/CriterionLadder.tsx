'use client'

import type { CriterionLadderData } from '@/lib/courses/criterion-ladder.server'
import { ladderFocus, focusMessage } from '@/lib/courses/criterion-ladder'

/**
 * How this lesson's component is marked: the criteria, their weights, and how
 * many bands each is split into.
 *
 * For the arts and the languages the criteria ARE the syllabus — a Visual Arts
 * process-portfolio lesson is not about a diagram-able object, it is about where
 * the marks sit. This is the picture for exactly the subjects that no drawn
 * family fits.
 *
 * NO BAND DESCRIPTOR TEXT. Those are verbatim licensed IB prose, and
 * `app/api/ib/catalog/route.ts` already sets this codebase's policy: public
 * surfaces carry "only non-sensitive metadata (codes, labels, level, model,
 * max_marks) — NOT the verbatim licensed descriptors/prose". Lesson pages are
 * public, prerendered and sitemapped, so they fall under that rule. The
 * descriptors remain in the database for the marking pipeline, which is where
 * they were licensed to be used.
 *
 * What survives is the genuinely useful part for a student planning work: which
 * criteria exist and which are worth the most.
 */
export function CriterionLadder({ data }: { data: CriterionLadderData }) {
  const total = data.criteria.reduce((n, c) => n + (c.maxMarks || 0), 0)
  // The shares are already on screen; what to do about them is not. Silent
  // when the criteria are evenly weighted, because there is no plan to give.
  const focus = focusMessage(ladderFocus(data.criteria))

  return (
    <div className="crit-ladder">
      <p className="body-2 crit-ladder-lead">
        <strong>{data.componentLabel}</strong>
        {`${data.maxMarks ? ` · ${data.maxMarks} marks` : ''} — assessed on ${data.criteria.length} ${
          data.criteria.length === 1 ? 'criterion' : 'criteria'
        }. Weightings below; the full descriptors are in your subject guide.`}
      </p>

      <ul className="crit-list">
        {data.criteria.map((c) => {
          const share = total > 0 ? Math.round((c.maxMarks / total) * 100) : 0
          return (
            <li key={c.letter} className="crit">
              <div className="crit-head crit-head--static">
                <span className="crit-letter mono">{c.letter}</span>
                <span className="crit-name">{c.name}</span>
                <span className="crit-marks mono">{c.maxMarks}</span>
              </div>
              <div className="crit-weight" aria-hidden>
                <span className="crit-weight-fill" style={{ width: `${share}%` }} />
              </div>
              <p className="micro crit-meta">
                {share}% of the marks · {c.bands.length} band
                {c.bands.length === 1 ? '' : 's'}
                {c.bands.length ? ` (${bandRangeLabel(c.bands)})` : ''}
              </p>
            </li>
          )
        })}
      </ul>

      {focus ? (
        <p className="crit-focus body-2">
          <span className="crit-focus-mark mono" aria-hidden>
            ↳
          </span>
          {focus}
        </p>
      ) : null}
    </div>
  )
}

function bandRangeLabel(bands: { marksMin: number; marksMax: number }[]): string {
  const lo = Math.min(...bands.map((b) => b.marksMin))
  const hi = Math.max(...bands.map((b) => b.marksMax))
  return `${lo}–${hi}`
}

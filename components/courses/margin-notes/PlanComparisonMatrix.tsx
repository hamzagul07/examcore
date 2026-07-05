import { capForTier, omniCapForTier } from '@/lib/billing/caps'
import { INTERACTIVE_DIAGRAMS_FREE } from '@/lib/billing/features'

/**
 * Full Free / Pro / Scholar / Max feature matrix. Rows mirror the per-plan card
 * lists on the pricing page (single source of truth: the same cap helpers), so
 * the cards and the matrix can never drift. A real <table> with row/column
 * headers keeps it accessible; ✓/— carry visually-hidden text so meaning isn't
 * colour-only. Column order: Free, Pro (student), Scholar (scholar), Max (mastery).
 */
type Cell = boolean | string

type Row = { label: string; cells: [Cell, Cell, Cell, Cell] }

const FEATURED_COL = 2 // Scholar

const ROWS: Row[] = [
  { label: 'Lessons — notes, formulas & worked examples', cells: [true, true, true, true] },
  {
    label: 'Questions marked / month',
    cells: [
      String(capForTier('free')),
      String(capForTier('student')),
      String(capForTier('scholar')),
      String(capForTier('mastery')),
    ],
  },
  {
    label: 'Study-chat messages / month',
    cells: [
      String(omniCapForTier('free')),
      String(omniCapForTier('student')),
      String(omniCapForTier('scholar')),
      String(omniCapForTier('mastery')),
    ],
  },
  { label: 'Live interactive diagrams', cells: [INTERACTIVE_DIAGRAMS_FREE, true, true, true] },
  { label: 'Whole-paper marking', cells: [false, true, true, true] },
  { label: 'Past-paper practice, flashcards & quizzes', cells: [false, true, true, true] },
  { label: 'In-depth, interactive courses', cells: [false, false, true, true] },
  { label: 'Examiner-style detailed marking feedback', cells: [false, false, true, true] },
  { label: 'Detailed progress journey & analytics', cells: [false, false, true, true] },
  { label: 'Extra revision resources & practice packs', cells: [false, false, true, true] },
  { label: 'Projected grade estimates', cells: [false, false, false, true] },
  { label: 'Priority marking queue', cells: [false, false, false, true] },
  { label: 'Early access to new features', cells: [false, false, false, true] },
]

function CellContent({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <>
        <span className="sr-only">Included</span>
        <span aria-hidden className="ms-matrix-yes">
          ✓
        </span>
      </>
    )
  }
  if (value === false) {
    return (
      <>
        <span className="sr-only">Not included</span>
        <span aria-hidden className="ms-matrix-no">
          —
        </span>
      </>
    )
  }
  return <span className="ms-matrix-val">{value}</span>
}

export function PlanComparisonMatrix() {
  return (
    <section className="ms-plan-matrix-wrap" aria-labelledby="plan-matrix-heading">
      <p className="overline" style={{ textAlign: 'center', marginBottom: 10 }}>
        Full breakdown
      </p>
      <h2 id="plan-matrix-heading" className="h3 section-title" style={{ textAlign: 'center' }}>
        Compare every feature
      </h2>
      <p className="body-2" style={{ textAlign: 'center', maxWidth: '48ch', margin: '0 auto 24px', color: 'var(--text-2)' }}>
        Every cap and feature side by side — Scholar highlighted as the sweet spot for exam prep.
      </p>
      <div className="ms-plan-matrix-scroll">
        <table className="ms-plan-matrix">
          <thead>
            <tr>
              <th scope="col" className="ms-matrix-feat-head">
                <span className="sr-only">Feature</span>
              </th>
              <th scope="col">Free</th>
              <th scope="col">Pro</th>
              <th scope="col" className="ms-matrix-col-featured">
                Scholar
              </th>
              <th scope="col">Max</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="ms-matrix-feat">
                  {row.label}
                </th>
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    className={i === FEATURED_COL ? 'ms-matrix-col-featured' : undefined}
                  >
                    <CellContent value={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

import { capForTier, omniCapForTier } from '@/lib/billing/caps'
import { INTERACTIVE_DIAGRAMS_FREE } from '@/lib/billing/features'

/**
 * Free / Starter / Scholar / Max feature matrix.
 *
 * Starter is the `student` tier, which used to be hidden from the sell surface
 * as legacy "Pro". The two rows that earn it a column are the ones a free user
 * has just been shown once and then lost: the verify pass and the full-marks
 * rewrite (see hasFirstMarkPremium). Everything above them is what Scholar adds
 * — whole papers, courses, the mastery map — so the step up stays a real step
 * rather than a bigger number.
 */
type Cell = boolean | string

type Row = { label: string; cells: [Cell, Cell, Cell, Cell] }

const FEATURED_COL = 3 // Max

const ROWS: Row[] = [
  {
    label: 'Lessons — notes, formulas & worked examples',
    cells: [true, true, true, true],
  },
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
  {
    label: 'Live interactive diagrams',
    cells: [INTERACTIVE_DIAGRAMS_FREE, true, true, true],
  },
  { label: 'Second-opinion verify pass on every mark', cells: [false, true, true, true] },
  { label: 'Your answer rewritten to full marks', cells: [false, true, true, true] },
  { label: 'Whole-paper marking', cells: [false, false, true, true] },
  {
    label: 'Past-paper practice, flashcards & quizzes',
    cells: [false, false, true, true],
  },
  { label: 'In-depth, interactive courses', cells: [false, false, true, true] },
  {
    label: 'Examiner-style detailed marking feedback',
    cells: [false, false, true, true],
  },
  { label: 'Detailed progress journey & analytics', cells: [false, false, true, true] },
  { label: 'Max Resource Vault', cells: [false, false, false, true] },
  {
    label: 'Personalised sprint packs & exam desks',
    cells: [false, false, false, true],
  },
  { label: 'Concept Cinema + visual course rebuild', cells: [false, false, false, true] },
  { label: 'Projected grade dashboard widget', cells: [false, false, false, true] },
  { label: 'Priority deep marking', cells: [false, false, false, true] },
  { label: 'Max weekly coach report', cells: [false, false, false, true] },
  { label: 'Welcome bonus marks (+25)', cells: [false, false, false, true] },
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

export function PlanComparisonMatrix({
  nested = false,
}: {
  nested?: boolean
} = {}) {
  return (
    <section
      className="ms-plan-matrix-wrap"
      aria-labelledby={nested ? undefined : 'plan-matrix-heading'}
      aria-label={nested ? 'Feature comparison by plan' : undefined}
    >
      {nested ? null : (
        <>
          <p className="overline" style={{ textAlign: 'center', marginBottom: 10 }}>
            Full breakdown
          </p>
          <h2 id="plan-matrix-heading" className="h3 section-title" style={{ textAlign: 'center' }}>
            Compare every feature
          </h2>
          <p
            className="body-2"
            style={{
              textAlign: 'center',
              maxWidth: '48ch',
              margin: '0 auto 24px',
              color: 'var(--text-2)',
            }}
          >
            Free to try the marker. Starter for weekly practice, marked twice over.
            Scholar for courses and whole papers. Max for the full exam machine —
            highlighted.
          </p>
        </>
      )}
      <div className="ms-plan-matrix-scroll">
        <table className="ms-plan-matrix">
          <caption className="sr-only">
            Feature comparison across Free, Starter, Scholar, and Max
          </caption>
          <thead>
            <tr>
              <th scope="col" className="ms-matrix-feat-head">
                <span className="sr-only">Feature</span>
              </th>
              <th scope="col">Free</th>
              <th scope="col">Starter</th>
              <th scope="col">Scholar</th>
              <th scope="col" className="ms-matrix-col-featured">
                Max
              </th>
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

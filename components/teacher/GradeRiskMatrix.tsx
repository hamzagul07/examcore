import Link from 'next/link'
import { Disclosure } from '@/components/ui/Disclosure'
import { QuadrantTooltip, type QuadrantTooltipPoint } from '@/components/teacher/QuadrantTooltip'
import { studentHref } from '@/components/teacher/assignments/links'
import {
  QUADRANT_ACCURACY_THRESHOLD,
  paceDivider,
  type Quadrant,
  type StudentQuadrantMetric,
} from '@/lib/teacher-analytics'
import {
  PLOT,
  QUADRANT_META,
  RISK_ORDER,
  formatPace,
  layoutRiskMatrix,
  pointLabel,
  riskTableOrder,
  type RiskLayout,
  type RiskPoint,
} from '@/lib/teacher/insights/risk-matrix'

/**
 * Ink per zone. Colour is never the only signal: every zone also has its own
 * marker shape (below) and its stamp in the legend and the table.
 */
const ZONE_INK: Record<Quadrant, string> = {
  safe: 'var(--ec-brand)',
  pacing_risk: 'var(--ec-chip-warning-text)',
  careless_risk: 'color-mix(in srgb, var(--ec-chip-warning-text) 45%, var(--ec-chip-critical-text))',
  under_prepared: 'var(--ec-chip-critical-text)',
}

/** Background wash per zone: faint enough that the marks stay the figure. */
const ZONE_WASH: Record<Quadrant, string> = {
  safe: 'color-mix(in srgb, var(--ec-brand) 6%, transparent)',
  pacing_risk: 'color-mix(in srgb, var(--ec-chip-warning-text) 7%, transparent)',
  careless_risk: 'color-mix(in srgb, var(--ec-chip-warning-text) 5%, transparent)',
  under_prepared: 'color-mix(in srgb, var(--ec-chip-critical-text) 7%, transparent)',
}

/**
 * Marker outlines in CSS pixels, centred on 0,0: circle (safe), square
 * (pacing), diamond (careless), triangle (under-prepared).
 */
const ZONE_SHAPE: Record<Quadrant, string> = {
  safe: 'M -6.5 0 A 6.5 6.5 0 1 0 6.5 0 A 6.5 6.5 0 1 0 -6.5 0 Z',
  pacing_risk: 'M -5.75 -5.75 H 5.75 V 5.75 H -5.75 Z',
  careless_risk: 'M 0 -7.75 L 7.75 0 L 0 7.75 L -7.75 0 Z',
  under_prepared: 'M 0 -7.5 L 7.25 6 L -7.25 6 Z',
}

/** Invisible hit radius around each marker: a 44px touch target. */
const HIT_RADIUS = 22

function pct(n: number): string {
  return `${n}%`
}

function tooltipPoint(p: RiskPoint, href: string | null): QuadrantTooltipPoint {
  const meta = QUADRANT_META[p.quadrant]
  return {
    id: p.id,
    href,
    name: p.name,
    stamp: meta.stamp,
    zone: `${meta.label} — ${meta.meaning}`,
    accuracy: `${Math.round(p.accuracy)}%`,
    pace: formatPace(p.minutesPerMark),
    scripts: `${p.attemptCount} marked ${p.attemptCount === 1 ? 'script' : 'scripts'}`,
    grade: p.predictedGrade && p.predictedGrade !== '—' ? p.predictedGrade : null,
    deficit: p.deficit ? `${p.deficit.name} (${Math.round(p.deficit.percentage)}%)` : null,
  }
}

/**
 * The grade risk matrix (docs/TEACHER_SYSTEM_SPEC.md §4): one mark per
 * student with marked work in the class subject, accuracy up the page and
 * pace across it — faster to the right, split at the class median.
 *
 * A server component. The layout (lib/teacher/insights/risk-matrix.ts) is
 * computed here and drawn as plain SVG; the only client code is the detail
 * card (QuadrantTooltip). No animation library: markers grow on hover and
 * focus with a CSS transition, which reduced-motion turns off.
 *
 * Honest about what it does not know:
 *   - A student with no timed work has no pace. They sit in a labelled
 *     "Untimed" lane, drawn hollow, at their real accuracy — never at a
 *     made-up pace.
 *   - With too few timed students for a class median there is no pace axis
 *     at all, and everyone is placed by accuracy alone (the zones collapse
 *     to "safe" and "under-prepared", as lib/teacher-analytics decides).
 *
 * Every marker is a link to the student's page (with `classroomId`), named
 * with every fact the card shows. The same students are listed, most at
 * risk first, in a table under the plot — the view for anyone who would
 * rather not read a scatter plot.
 *
 * Full names are fine here: this is the teacher's own screen.
 */
export function GradeRiskMatrix({
  students,
  classroomId,
  truncated = false,
  headingId = 'grade-risk-title',
}: {
  students: readonly StudentQuadrantMetric[]
  /** Makes every marker and table row a link to the student's page. */
  classroomId?: string
  /** The figures come from the newest part of a long history. */
  truncated?: boolean
  headingId?: string
}) {
  if (students.length === 0) {
    return (
      <section className="ms-teacher-empty" aria-labelledby={headingId}>
        <span className="ms-teacher-empty__icon" aria-hidden>
          RSK
        </span>
        <h2 id={headingId} className="ms-teacher-empty__title">
          No one on the risk matrix yet
        </h2>
        <p className="ms-teacher-empty__body">
          Each student appears here, by accuracy and pace, once they have marked work in this class&apos;s subject.
        </p>
      </section>
    )
  }

  const layout = layoutRiskMatrix(students, {
    divider: paceDivider(students),
    threshold: QUADRANT_ACCURACY_THRESHOLD,
  })
  const hrefFor = (id: string) => (classroomId ? studentHref(classroomId, id) : null)
  const tooltipPoints = layout.points.map((p) => tooltipPoint(p, hrefFor(p.id)))
  const descId = `${headingId}-desc`

  return (
    <section className="ms-teacher-risk-matrix ec-card ec-card--paper p-5 sm:p-8" aria-labelledby={headingId}>
      <div className="mb-5">
        <p className="ec-label-tech mb-2">Risk matrix</p>
        <h2 id={headingId} className="text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">
          Grade boundary risk
        </h2>
        <p id={descId} className="mt-2 max-w-2xl text-sm text-[var(--ec-text-secondary)]">
          {layout.mode === 'pace'
            ? `Each mark is a student: accuracy up the page, pace across it — faster to the right of the class median. The line across is ${layout.threshold}% accurate.`
            : `Each mark is a student, placed by accuracy — the line across is ${layout.threshold}% accurate. Fewer than three students have timed work, so there is no pace comparison yet.`}
          {layout.untimedCount > 0 && layout.mode === 'pace'
            ? ` Hollow marks on the left have no timed work, so no pace.`
            : ''}
          {truncated ? ' Based on the class’s most recent marked work.' : ''}
        </p>
      </div>

      <QuadrantTooltip points={tooltipPoints}>
        <div className="ms-teacher-risk-plot relative h-72 overflow-hidden rounded-[4px] border-[1.5px] border-[var(--ec-border)] bg-[var(--ec-paper)] sm:h-80 md:h-96">
          <svg
            className="absolute inset-0 h-full w-full"
            role="group"
            aria-label={`Grade risk matrix, ${layout.points.length} ${layout.points.length === 1 ? 'student' : 'students'}.${classroomId ? ' Each mark links to the student.' : ''}`}
            aria-describedby={descId}
          >
            <PlotBackdrop layout={layout} />
            <g>
              {layout.points.map((p) => (
                <RiskMark key={p.id} point={p} href={hrefFor(p.id)} />
              ))}
            </g>
          </svg>
        </div>
      </QuadrantTooltip>

      <p className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-[var(--ec-text-secondary)]" aria-hidden>
        {layout.mode === 'pace' ? (
          <>
            <span>← slower</span>
            <span>
              pace · median {formatPace(layout.divider?.minutes)}
            </span>
            <span>faster →</span>
          </>
        ) : (
          <span>Across the page: spread out so marks don&apos;t overlap — position carries no meaning.</span>
        )}
      </p>

      <RiskLegend layout={layout} />

      <Disclosure
        className="mt-6"
        summaryClassName="cursor-pointer py-3 text-sm font-semibold text-[var(--ec-text-primary)]"
        summary={`Show as a table (${layout.points.length} ${layout.points.length === 1 ? 'student' : 'students'})`}
      >
        <RiskTable points={layout.points} hrefFor={hrefFor} />
      </Disclosure>
    </section>
  )
}

/** Zones, the untimed lane, the threshold and median lines, and their labels. Decorative: the marks carry the data. */
function PlotBackdrop({ layout }: { layout: RiskLayout }) {
  const lane = layout.untimedLane
  const area = layout.timedArea
  return (
    <g aria-hidden="true">
      {layout.regions.map((r) => (
        <rect
          key={r.quadrant}
          x={pct(r.x)}
          y={pct(r.y)}
          width={pct(r.width)}
          height={pct(r.height)}
          // Style, not the attribute: color-mix() is reliable in CSS, not in presentation attributes.
          style={{ fill: ZONE_WASH[r.quadrant] }}
        />
      ))}
      {layout.regions.map((r) => {
        const right = r.x + r.width > 60
        return (
          <text
            key={`${r.quadrant}-label`}
            x={pct(right ? r.x + r.width - 1 : r.x + 1)}
            y={pct(r.y)}
            dy={14}
            textAnchor={right ? 'end' : 'start'}
            className="fill-[var(--ec-text-secondary)] font-mono text-[9px] font-bold uppercase tracking-[0.08em]"
          >
            {QUADRANT_META[r.quadrant].label}
          </text>
        )
      })}

      {lane ? (
        <>
          <rect
            x={pct(lane.left)}
            y={pct(PLOT.top)}
            width={pct(lane.right - lane.left)}
            height={pct(PLOT.bottom - PLOT.top)}
            fill="var(--ec-surface-raised)"
          />
          <text
            x={pct((lane.left + lane.right) / 2)}
            y={pct(PLOT.top)}
            dy={14}
            textAnchor="middle"
            className="fill-[var(--ec-text-secondary)] font-mono text-[9px] font-bold uppercase tracking-[0.08em]"
          >
            Untimed
          </text>
          <line
            x1={pct((lane.right + area.left) / 2)}
            x2={pct((lane.right + area.left) / 2)}
            y1={pct(PLOT.top)}
            y2={pct(PLOT.bottom)}
            stroke="var(--ec-border)"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        </>
      ) : null}

      <line
        x1={pct(lane ? lane.left : area.left)}
        x2={pct(area.right)}
        y1={pct(layout.thresholdY)}
        y2={pct(layout.thresholdY)}
        stroke="var(--ec-border-strong, var(--ec-border))"
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      <text
        x={pct(area.right)}
        y={pct(layout.thresholdY)}
        dy={-5}
        textAnchor="end"
        className="fill-[var(--ec-text-secondary)] font-mono text-[10px] font-semibold"
      >
        {layout.threshold}%
      </text>

      {layout.divider ? (
        <line
          x1={pct(layout.divider.x)}
          x2={pct(layout.divider.x)}
          y1={pct(PLOT.top)}
          y2={pct(PLOT.bottom)}
          stroke="var(--ec-border-strong, var(--ec-border))"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      ) : null}

      <text
        x={pct(area.right)}
        y={pct(PLOT.top)}
        dy={-3}
        textAnchor="end"
        className="fill-[var(--ec-text-secondary)] font-mono text-[9px]"
      >
        100%
      </text>
      <text
        x={pct(area.right)}
        y={pct(PLOT.bottom)}
        dy={11}
        textAnchor="end"
        className="fill-[var(--ec-text-secondary)] font-mono text-[9px]"
      >
        0%
      </text>
    </g>
  )
}

/**
 * One student's marker. A nested <svg> places it at percentage coordinates
 * (so the plot needs no viewBox and text stays in CSS pixels) while the
 * shape itself is drawn in pixels around 0,0.
 */
function RiskMark({ point, href }: { point: RiskPoint; href: string | null }) {
  const ink = ZONE_INK[point.quadrant]
  const shape = (
    <svg x={pct(point.x)} y={pct(point.y)} width={1} height={1} overflow="visible">
      <circle r={HIT_RADIUS} fill="transparent" />
      <circle
        r={12}
        fill="none"
        stroke="var(--ec-brand)"
        strokeWidth={2}
        className="opacity-0 transition-opacity duration-150 group-focus-visible:opacity-100 motion-reduce:transition-none"
      />
      <path
        d={ZONE_SHAPE[point.quadrant]}
        style={{ fill: point.timed ? ink : 'var(--ec-paper)', stroke: point.timed ? 'var(--ec-paper)' : ink }}
        strokeWidth={point.timed ? 1.25 : 2}
        className="origin-center transition-transform duration-150 [transform-box:fill-box] group-hover:scale-125 group-focus-visible:scale-125 motion-reduce:transition-none"
      />
    </svg>
  )
  const label = pointLabel(point)
  if (href) {
    return (
      <a href={href} data-risk-id={point.id} aria-label={label} className="group cursor-pointer outline-none">
        {shape}
      </a>
    )
  }
  return (
    <g data-risk-id={point.id} role="img" aria-label={label}>
      {shape}
    </g>
  )
}

/** The zone key: counts per zone with each zone's marker, and what hollow means. */
function RiskLegend({ layout }: { layout: RiskLayout }) {
  const zones: readonly Quadrant[] =
    layout.mode === 'pace' ? RISK_ORDER : RISK_ORDER.filter((q) => q === 'safe' || q === 'under_prepared')
  return (
    <div className="mt-5">
      <ul
        className="ms-teacher-risk-legend grid list-none grid-cols-1 gap-3 p-0 min-[420px]:grid-cols-2 md:grid-cols-4"
        aria-label="Students per zone"
      >
        {zones.map((q) => {
          const meta = QUADRANT_META[q]
          const count = layout.counts[q]
          return (
            <li key={q} className="ms-teacher-risk-legend__cell">
              <span className="ms-teacher-risk-legend__stamp" aria-hidden>
                {meta.stamp}
              </span>
              <svg width={18} height={18} aria-hidden className="shrink-0 overflow-visible">
                <path d={ZONE_SHAPE[q]} transform="translate(9 9)" style={{ fill: ZONE_INK[q] }} />
              </svg>
              <div className="min-w-0">
                <div className="text-xs text-[var(--ec-text-secondary)]">{meta.label}</div>
                <div className="font-display text-lg font-medium text-[var(--ec-text-primary)]">
                  {count}
                  <span className="sr-only"> {count === 1 ? 'student' : 'students'}</span>
                </div>
                <div className="text-xs text-[var(--ec-text-secondary)]">{meta.meaning}</div>
              </div>
            </li>
          )
        })}
      </ul>
      {layout.untimedCount > 0 ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-[var(--ec-text-secondary)]">
          <svg width={16} height={16} aria-hidden className="shrink-0 overflow-visible">
            <path
              d={ZONE_SHAPE.safe}
              transform="translate(8 8)"
              fill="var(--ec-paper)"
              stroke="var(--ec-text-secondary)"
              strokeWidth={2}
            />
          </svg>
          <span>
            Hollow: no timed work yet ({layout.untimedCount} of {layout.points.length}) — placed by accuracy only.
          </span>
        </p>
      ) : null}
    </div>
  )
}

/** Everyone on the matrix, most at risk first, as rows a screen reader can walk. */
function RiskTable({ points, hrefFor }: { points: readonly RiskPoint[]; hrefFor: (id: string) => string | null }) {
  const rows = riskTableOrder(points)
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">Students on the grade risk matrix, most at risk first</caption>
        <thead>
          <tr className="border-b-[1.5px] border-[var(--ec-border)] text-xs text-[var(--ec-text-secondary)]">
            <th scope="col" className="py-2 pr-3 font-semibold">
              Student
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Zone
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">
              Accuracy
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">
              Pace
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Predicted
            </th>
            <th scope="col" className="py-2 font-semibold">
              Weakest topic
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const href = hrefFor(p.id)
            const meta = QUADRANT_META[p.quadrant]
            return (
              <tr key={p.id} className="border-b border-[var(--ec-border)] align-top">
                <th scope="row" className="py-2 pr-3 font-semibold text-[var(--ec-text-primary)]">
                  {href ? (
                    <Link href={href} className="inline-flex min-h-[44px] items-center hover:underline">
                      {p.name}
                    </Link>
                  ) : (
                    p.name
                  )}
                </th>
                <td className="py-2 pr-3 text-[var(--ec-text-primary)]">
                  <span className="mr-2 font-mono text-[10px] font-bold tracking-[0.06em] text-[var(--ec-text-secondary)]" aria-hidden>
                    {meta.stamp}
                  </span>
                  {meta.label}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-[var(--ec-text-primary)]">
                  {Math.round(p.accuracy)}%
                  <span className="block text-xs text-[var(--ec-text-secondary)]">
                    {p.attemptCount} {p.attemptCount === 1 ? 'script' : 'scripts'}
                  </span>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-[var(--ec-text-primary)]">
                  {p.timed ? formatPace(p.minutesPerMark) : 'untimed'}
                </td>
                <td className="py-2 pr-3 text-[var(--ec-text-primary)]">
                  {p.predictedGrade && p.predictedGrade !== '—' ? p.predictedGrade : <span aria-label="No prediction">—</span>}
                </td>
                <td className="py-2 text-[var(--ec-text-primary)]">
                  {p.deficit ? (
                    <>
                      {p.deficit.name}{' '}
                      <span className="tabular-nums text-[var(--ec-text-secondary)]">
                        {Math.round(p.deficit.percentage)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-[var(--ec-text-secondary)]">None flagged</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

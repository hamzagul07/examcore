import { MathText } from '@/components/MathText'
import type { CohortGapReport, MarkTypeGap } from '@/lib/teacher/cohort-gaps'

/** Weak marks read as a warning, strong ones as reassurance — in words too (the row's figures). */
function barInk(pct: number): string {
  if (pct < 40) return 'var(--ec-chip-critical-text)'
  if (pct < 75) return 'var(--ec-chip-warning-text)'
  return 'var(--ec-brand)'
}

/**
 * Where a class loses marks, by kind of mark (the cohort gap report, spec
 * §4 `.../gaps`: "existing layout"): the headline weakness, every mark type
 * weakest first, the specific points most students missed, and why marks
 * were dropped by the marker's own classification.
 *
 * The report is either the whole class's scoped work or one set's hand-ins
 * — the page says which in `scope`. Thin evidence is said in words and drawn
 * faintly, so a number the report does not trust never reads as a finding.
 * A server component.
 */
export function GapReport({
  report,
  headline,
  scope,
  emptyHint = null,
  truncated = false,
  headingId = 'gap-report-title',
}: {
  report: CohortGapReport
  headline: MarkTypeGap | null
  /** "across the class" / "on Vectors homework" — completes the heading. */
  scope: string
  /**
   * What to do about too little evidence, after "needs three marked scripts":
   * on a set, wait for hand-ins; across a class that can set work, set some.
   * Null says nothing more (e.g. with sets switched off).
   */
  emptyHint?: string | null
  truncated?: boolean
  headingId?: string
}) {
  return (
    <section className="mb-8" aria-labelledby={headingId}>
      <div className="mb-4">
        <p className="ec-label-tech mb-2">Cohort gap report</p>
        <h2 id={headingId} className="text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">
          Where marks are lost {scope}
        </h2>
        {report.scripts > 0 ? (
          <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
            {report.scripts} marked {report.scripts === 1 ? 'script' : 'scripts'} from {report.students}{' '}
            {report.students === 1 ? 'student' : 'students'} · average {report.averagePct}%
            {truncated ? ' · the most recent marked work' : ''}
          </p>
        ) : null}
        {report.bandedScriptsExcluded > 0 ? (
          <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
            {report.bandedScriptsExcluded} essay-style{' '}
            {report.bandedScriptsExcluded === 1 ? 'script is' : 'scripts are'} in the average but not in the mark-type
            breakdown — {report.bandedScriptsExcluded === 1 ? 'it is' : 'they are'} marked against bands rather than
            individual marks.
          </p>
        ) : null}
      </div>

      {report.insufficientEvidence ? (
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon" aria-hidden>
            ¶
          </span>
          <h3 className="ms-teacher-empty__title">Not enough marked work yet</h3>
          <p className="ms-teacher-empty__body">
            The report needs at least three marked scripts before it says anything about the class.
            {emptyHint ? ` ${emptyHint}` : ''}
          </p>
        </div>
      ) : (
        <>
          {headline ? (
            <div className="ec-card ec-card--paper mb-6 p-5 sm:p-6">
              <p className="ec-label-tech mb-2 flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold tracking-wide text-[var(--ec-brand)]" aria-hidden>
                  ¶
                </span>
                The headline
              </p>
              <p className="text-xl font-bold text-[var(--ec-text-primary)]">
                The class earns only {headline.earnedPct}% of {headline.label} marks
                <span className="font-normal text-[var(--ec-text-secondary)]">
                  {' '}
                  ({headline.earned} of {headline.points} available)
                </span>
              </p>
            </div>
          ) : null}

          {report.markTypes.length > 0 ? (
            <div className="ec-card ec-card--paper mb-6 p-5 sm:p-6">
              <h3 className="ec-label-tech mb-4">By mark type — weakest first</h3>
              <ul className="m-0 list-none p-0">
                {report.markTypes.map((t) => (
                  <li key={t.code} className="ms-gap-row">
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                      <span className="font-medium text-[var(--ec-text-primary)]">
                        {t.label}
                        {t.thinEvidence ? (
                          <span className="ml-2 text-xs font-normal text-[var(--ec-text-secondary)]">
                            thin evidence — too few marked to trust
                          </span>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-[var(--ec-text-secondary)]">
                        {t.earned}/{t.points} · {t.earnedPct}%
                      </span>
                    </div>
                    <div className="ms-gap-track" aria-hidden>
                      <div
                        className="ms-gap-fill"
                        style={{
                          width: `${Math.max(0, Math.min(100, t.earnedPct))}%`,
                          background: barInk(t.earnedPct),
                          // Drawn faintly so the eye is not pulled to a number the row says not to trust.
                          opacity: t.thinEvidence ? 0.4 : 1,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.mostMissed.length > 0 ? (
            <div className="ec-card ec-card--paper mb-6 p-5 sm:p-6">
              <h3 className="ec-label-tech mb-4">The specific things most students missed</h3>
              <ul className="m-0 list-none space-y-2 p-0">
                {report.mostMissed.map((m) => (
                  <li key={m.note} className="flex gap-3 text-sm">
                    <span className="min-w-[5.5rem] shrink-0 tabular-nums text-[var(--ec-text-secondary)]">
                      {m.students} {m.students === 1 ? 'student' : 'students'}
                    </span>
                    <span className="min-w-0 text-[var(--ec-text-primary)] [overflow-wrap:anywhere]">
                      <MathText text={m.note} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.errorBreakdown.length > 0 ? (
            <div className="ec-card ec-card--paper p-5 sm:p-6">
              <h3 className="ec-label-tech mb-4">Why marks were dropped</h3>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {report.errorBreakdown.map((e) => (
                  <li key={e.classification} className="ms-teacher-chip">
                    {e.label} · {e.count}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

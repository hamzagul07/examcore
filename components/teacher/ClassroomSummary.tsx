'use client'

import { CountUp } from '@/components/ui/CountUp'

interface Props {
  studentCount: number
  totalAttempts: number
  avgScore: number
}

export function ClassroomSummary({ studentCount, totalAttempts, avgScore }: Props) {
  // A class with no marked work has no average — it has an unknown one. Rendering
  // `avgScore.toFixed(0)}%` regardless meant every teacher's first screen told
  // them their class averages 0%, which is a false statement dressed as a
  // measurement. Counts are still true at zero; only the average is undefined.
  //
  // Gated on attempts rather than on the score, because a class that genuinely
  // scored 0% should see 0%.
  const hasMarkedWork = totalAttempts > 0

  // The tallies count up as the desk lands (tabular figures on the cell keep the
  // width steady); the dash for an unknown average never animates.
  return (
    <dl className="ms-teacher-tally">
      <div className="ms-teacher-tally__cell">
        <dt className="ms-teacher-tally__label">Students</dt>
        <dd className="ms-teacher-tally__value">
          <CountUp value={studentCount} />
        </dd>
      </div>
      <div className="ms-teacher-tally__cell">
        <dt className="ms-teacher-tally__label">Attempts</dt>
        <dd className="ms-teacher-tally__value">
          <CountUp value={totalAttempts} />
        </dd>
      </div>
      <div className="ms-teacher-tally__cell">
        <dt className="ms-teacher-tally__label">Class average</dt>
        <dd className="ms-teacher-tally__value">
          {hasMarkedWork ? (
            <>
              <CountUp value={Math.round(avgScore)} />%
            </>
          ) : (
            <span aria-label="No class average yet">—</span>
          )}
        </dd>
        {!hasMarkedWork ? (
          <p className="mt-1 text-xs text-[var(--ec-text-secondary)]">no marks yet</p>
        ) : null}
      </div>
    </dl>
  )
}

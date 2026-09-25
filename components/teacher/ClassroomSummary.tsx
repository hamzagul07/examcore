import { NO_DATA, percentOrDash } from '@/lib/teacher/stat-display'
import type { ClassSummary } from '@/lib/teacher-analytics'

/**
 * The class's headline figures as a tally (`.ms-teacher-tally`, three
 * cells): who has work in, the class average and the evidence behind it, and
 * how much of the syllabus the class has been marked on — all over its
 * scoped work (active members, marked since joining, in the class subject).
 *
 * A class with no marked work has no average — it has an unknown one — so
 * derived figures read as a dash with a reason, never 0% (see
 * lib/teacher/stat-display). Counts are still true at zero.
 */
export function ClassroomSummary({
  summary,
}: {
  summary: Pick<ClassSummary, 'studentCount' | 'studentsWithWork' | 'totalAttempts' | 'avgScore' | 'coverage'>
}) {
  const marked = summary.totalAttempts > 0
  const scripts = `${summary.totalAttempts} marked ${summary.totalAttempts === 1 ? 'script' : 'scripts'}`
  return (
    <dl className="ms-teacher-tally mb-8">
      <div className="ms-teacher-tally__cell">
        <dt className="ms-teacher-tally__label">Students with work</dt>
        <dd className="ms-teacher-tally__value">
          {summary.studentsWithWork}
          <span className="text-base text-[var(--ec-text-secondary)]"> of {summary.studentCount}</span>
        </dd>
      </div>
      <div className="ms-teacher-tally__cell">
        <dt className="ms-teacher-tally__label">Class average</dt>
        <dd className="ms-teacher-tally__value">
          {marked ? percentOrDash(summary.avgScore, summary.totalAttempts) : <Unknown label="No class average yet" />}
        </dd>
        <dd className="mt-2 text-xs text-[var(--ec-text-secondary)]">{marked ? `across ${scripts}` : 'no marks yet'}</dd>
      </div>
      <div className="ms-teacher-tally__cell">
        <dt className="ms-teacher-tally__label">Syllabus covered</dt>
        <dd className="ms-teacher-tally__value">
          {summary.coverage !== null && marked ? (
            `${Math.round(summary.coverage)}%`
          ) : (
            <Unknown label={summary.coverage === null ? 'No syllabus to measure against' : 'Nothing covered yet'} />
          )}
        </dd>
        <dd className="mt-2 text-xs text-[var(--ec-text-secondary)]">
          {summary.coverage === null ? 'set the class syllabus in Settings' : 'of topics with marked work'}
        </dd>
      </div>
    </dl>
  )
}

/** A dash for sighted readers, the reason for everyone else. */
function Unknown({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden>{NO_DATA}</span>
      <span className="sr-only">{label}</span>
    </>
  )
}

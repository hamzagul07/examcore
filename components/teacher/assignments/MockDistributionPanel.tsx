import { NO_DATA } from '@/lib/teacher/stat-display'
import type { StudentAssignmentState } from '@/lib/teacher/types'
import { MOCK_MIN_MARKED, mockDistribution } from '@/components/teacher/assignments/mock-distribution'

/**
 * A mock's grade spread (docs/TEACHER_SYSTEM_SPEC.md §4: "Mock sets add
 * MockDistributionPanel (grade histogram via predictGrade per student;
 * NO_DATA under 3 marked)"). One row per grade — or per percentage band on
 * boards without A*–U letters — with a bar, the count and who is in it.
 * The counts are the text; the bars are decoration.
 */
export function MockDistributionPanel({
  students,
  letterGrades,
}: {
  students: readonly StudentAssignmentState[]
  /** False for IB / AP classes, whose grades have no fixed percentage boundaries. */
  letterGrades: boolean
}) {
  const d = mockDistribution(students, { letterGrades })
  const max = Math.max(1, ...d.bins.map((b) => b.count))

  return (
    <section aria-labelledby="mock-spread-title" className="ms-teacher-roster">
      <div className="ms-class-due__head">
        <div className="min-w-0">
          <h2 id="mock-spread-title" className="ms-class-due__title">
            Mock grade spread
          </h2>
          <p className="ms-class-due__sub">
            {d.scale === 'grades'
              ? 'Each student who sat the whole mock, placed by the same boundaries as their predicted grade.'
              : 'In percentage bands: this course’s grades have no fixed percentage boundaries to place them by.'}
            {d.unmarked > 0 ? ` ${d.unmarked} still to hand in.` : ''}
          </p>
        </div>
        {d.enough && d.median_pct !== null ? (
          <p className="m-0 font-mono text-sm font-bold text-[var(--ec-text-primary)]">
            Median {Math.round(d.median_pct)}%
          </p>
        ) : null}
      </div>

      {!d.enough ? (
        <div className="flex items-start gap-3">
          <span className="ms-teacher-empty__icon" aria-hidden>
            {NO_DATA}
          </span>
          <p className="m-0 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            Not enough scripts for a spread yet: {d.marked} of the {MOCK_MIN_MARKED} whole mocks it needs{' '}
            {d.marked === 1 ? 'is' : 'are'} in.
          </p>
        </div>
      ) : (
        <ul className="ms-class-due__list" aria-label={d.scale === 'grades' ? 'Students by grade' : 'Students by band'}>
          {d.bins.map((b) => (
            <li key={b.label} className="ms-class-due__row">
              <div className="ms-class-due__row-main">
                <p className="ms-class-due__name">{b.label}</p>
                <p className="ms-class-due__meta">{b.names.length > 0 ? b.names.join(', ') : 'Nobody'}</p>
              </div>
              <span className="ms-class-due__bar" aria-hidden>
                {b.count > 0 ? (
                  <span
                    className="ms-class-due__fill ms-class-due__fill--done"
                    style={{ width: `${Math.round((b.count / max) * 100)}%` }}
                  />
                ) : null}
              </span>
              <span className="ms-class-due__pct">
                {b.count}
                <span className="sr-only"> {b.count === 1 ? 'student' : 'students'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

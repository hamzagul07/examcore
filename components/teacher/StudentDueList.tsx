import type { StudentDueTopic } from '@/lib/teacher/cohort-due'
import { dueAgeLabel } from '@/lib/teacher/insights/format'

const SOURCE_LABEL: Record<StudentDueTopic['source'], string> = {
  attempts: 'Due for a re-mark',
  recall: 'Lesson check, not yet marked',
}

/**
 * What is cooling off for one student now, on their teacher's student page
 * (spec §4 `.../students/[studentId]`): topics in the class subject, from
 * work since they joined. Presentational: the page loads `topics` on the
 * server (loadStudentDue) and passes `error` when the schedule tables could
 * not be read — a failed read is never shown as "nothing due".
 */
export function StudentDueList({
  topics,
  error = null,
  firstName,
  nowIso,
  headingId = 'student-due-title',
}: {
  topics: readonly StudentDueTopic[]
  error?: string | null
  /** "Amira" — for the headings. */
  firstName: string
  /** When the page was computed, so "3 days overdue" is the same on server and client. */
  nowIso: string
  headingId?: string
}) {
  if (error) {
    return (
      <section className="ms-teacher-error mb-8" role="alert" aria-labelledby={headingId}>
        <h2 id={headingId} className="ms-teacher-error__title">
          Due topics didn&apos;t load
        </h2>
        <p className="ms-teacher-error__body">{error}</p>
      </section>
    )
  }

  const now = Date.parse(nowIso)
  return (
    <section className="ms-student-due ec-card ec-card--paper mb-8 p-5 sm:p-6" aria-labelledby={headingId}>
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`ec-ink-stamp ec-ink-stamp--inline${topics.length > 0 ? ' ec-ink-stamp--crimson' : ''}`}
          aria-hidden
        >
          DUE
        </span>
        <span className="ec-label-tech">Due for review</span>
      </div>
      {topics.length === 0 ? (
        <>
          <h2 id={headingId} className="ms-student-due__title">
            Nothing due for {firstName}
          </h2>
          <p className="ms-student-due__sub">
            When a topic they have been marked on in this subject is due for another look, it shows up here.
          </p>
        </>
      ) : (
        <>
          <h2 id={headingId} className="ms-student-due__title">
            {topics.length} {topics.length === 1 ? 'topic' : 'topics'} cooling off for {firstName}
          </h2>
          <p className="ms-student-due__sub">One marked question on a topic resets its clock.</p>
          <ul className="ms-student-due__list">
            {topics.map((t) => (
              <li key={`${t.subjectCode}-${t.topicCode}`} className="ms-student-due__row">
                <div className="min-w-0">
                  <p className="ms-student-due__name">
                    {t.name}
                    <span className="ms-student-due__code"> · {t.topicCode}</span>
                  </p>
                  <p className="ms-student-due__meta">
                    {SOURCE_LABEL[t.source]} · {dueAgeLabel(t.dueAt, now)}
                  </p>
                </div>
                <span className={`ms-student-due__badge${t.source === 'recall' ? ' ms-student-due__badge--recall' : ''}`}>
                  {t.source === 'recall' ? 'Check' : 'Re-mark'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

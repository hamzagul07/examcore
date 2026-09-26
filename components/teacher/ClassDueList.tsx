import { LoadingLink } from '@/components/ui/LoadingLink'
import { composerHref } from '@/components/teacher/assignments/links'
import type { CohortDueTopic } from '@/lib/teacher/cohort-due'

const SOURCE_LABEL: Record<CohortDueTopic['source'], string> = {
  attempts: 'from marked work',
  recall: 'from lesson checks',
  both: 'from marked work and lesson checks',
}

/** Topics a drill link carries: the three most-owed. */
const DRILL_TOPICS = 3

/**
 * Topics cooling off across the class — where spaced review says students
 * are due to be re-marked, most students first (spec §4, the Gaps tab). In
 * the class subject only, for work each student did since joining
 * (loadClassDue).
 *
 * Presentational and hook-free: the page loads the topics on the server and
 * passes `topics`, or `error` when the schedule tables could not be read. A
 * failed read is said in words, never shown as "nothing due".
 */
export function ClassDueList({
  classroomId,
  topics,
  students,
  error = null,
  canSetWork = true,
  showSubject = false,
  headingId = 'class-due-title',
}: {
  classroomId: string
  topics: readonly CohortDueTopic[]
  /** Active members the list is counted against. */
  students: number
  error?: string | null
  canSetWork?: boolean
  /** Name the subject on each row — for a class with no syllabus set, whose topics span subjects. */
  showSubject?: boolean
  headingId?: string
}) {
  if (error) {
    return (
      <section className="ms-teacher-error mb-8" role="alert" aria-labelledby={headingId}>
        <h2 id={headingId} className="ms-teacher-error__title">
          The class due list didn&apos;t load
        </h2>
        <p className="ms-teacher-error__body">{error}</p>
      </section>
    )
  }

  if (topics.length === 0) {
    return (
      <section className="ms-teacher-empty mb-8" aria-labelledby={headingId}>
        <span className="ms-teacher-empty__icon" aria-hidden>
          DUE
        </span>
        <h2 id={headingId} className="ms-teacher-empty__title">
          Nothing due across the class
        </h2>
        <p className="ms-teacher-empty__body">
          {students === 0
            ? 'Once students join and mark work, topics that are cooling off will gather here.'
            : 'As students mark questions and finish lesson checks, topics that are due for another look will gather here.'}
        </p>
      </section>
    )
  }

  const lead = topics[0]
  const codes = topics.slice(0, DRILL_TOPICS).map((t) => t.topicCode)

  return (
    <section className="ms-class-due ec-card ec-card--paper mb-8 p-5 sm:p-8" aria-labelledby={headingId}>
      <div className="ms-class-due__head">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="ec-ink-stamp ec-ink-stamp--crimson ec-ink-stamp--inline" aria-hidden>
              DUE
            </span>
            <span className="ec-label-tech">Due for review</span>
          </div>
          <h2 id={headingId} className="ms-class-due__title">
            {lead.studentsDue} of {students} due on {lead.name}
          </h2>
          <p className="ms-class-due__sub">
            Topics students have not been re-marked on since spaced review said they were due — the most students
            first.
          </p>
        </div>
      </div>

      <ol className="ms-class-due__list" aria-label={`${topics.length} topics due across the class`}>
        {topics.map((t) => (
          <li key={`${t.subjectCode}-${t.topicCode}`} className="ms-class-due__row">
            <div className="ms-class-due__row-main">
              <p className="ms-class-due__name">
                {t.name}
                <span className="ms-class-due__code">
                  {showSubject ? ` · ${t.subjectLabel}` : ''} · {t.topicCode}
                </span>
              </p>
              <p className="ms-class-due__meta">
                {t.studentsDue} of {t.totalStudents} students · {SOURCE_LABEL[t.source]}
                {t.sampleNames.length > 0 ? ` · ${t.sampleNames.join(', ')}` : ''}
                {t.studentsDue > t.sampleNames.length && t.sampleNames.length > 0
                  ? ` +${t.studentsDue - t.sampleNames.length}`
                  : ''}
              </p>
            </div>
            <div className="ms-class-due__bar" aria-hidden>
              <span className="ms-class-due__fill" style={{ width: `${Math.max(4, Math.min(100, t.duePct))}%` }} />
            </div>
            <span className="ms-class-due__pct">{t.duePct}%</span>
          </li>
        ))}
      </ol>

      {canSetWork ? (
        <div className="ms-class-due__act">
          <LoadingLink
            href={composerHref(classroomId, { codes })}
            loadingText="Opening…"
            className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2"
          >
            <span className="font-mono text-[11px] font-bold" aria-hidden>
              +
            </span>
            Set work on the top {codes.length === 1 ? 'topic' : `${codes.length} topics`}
          </LoadingLink>
        </div>
      ) : null}
    </section>
  )
}

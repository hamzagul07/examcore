import Link from 'next/link'
import type { ClassWeek } from '@/lib/teacher/types'
import { studentHref } from '@/components/teacher/assignments/links'

/** Rows shown per group; the rest are a link to the Students tab. */
const SHOWN = 6

type Row = { id: string; name: string; meta: string; metaLabel: string }

function Group({
  classroomId,
  title,
  modifier,
  rows,
  empty,
  headingId,
}: {
  classroomId: string
  title: string
  modifier: 'silent' | 'struggling' | 'improving'
  rows: Row[]
  empty: string
  headingId: string
}) {
  const shown = rows.slice(0, SHOWN)
  const rest = rows.length - shown.length
  return (
    <div className={`ms-students-watch__group ms-students-watch__group--${modifier}`}>
      <h3 id={headingId} className="ms-students-watch__title">
        {title}
        {rows.length > 0 ? <span className="sr-only"> ({rows.length})</span> : null}
      </h3>
      {shown.length === 0 ? (
        <p className="ms-students-watch__empty">{empty}</p>
      ) : (
        <ul className="ms-students-watch__list" aria-labelledby={headingId}>
          {shown.map((r) => (
            <li key={r.id}>
              <Link href={studentHref(classroomId, r.id)} className="ms-students-watch__row">
                <span className="ms-students-watch__name">{r.name}</span>
                <span className="ms-students-watch__meta">
                  <span aria-hidden>{r.meta}</span>
                  <span className="sr-only">{r.metaLabel}</span>
                </span>
              </Link>
            </li>
          ))}
          {rest > 0 ? (
            <li>
              <Link href={`/teacher/classroom/${encodeURIComponent(classroomId)}/students`} className="ms-students-watch__row">
                <span className="ms-students-watch__name">+{rest} more</span>
                <span className="ms-students-watch__meta" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}

/**
 * Students to watch (docs/TEACHER_SYSTEM_SPEC.md §4: "silent 14d / <40% on
 * last set / improving"), as the three short columns of `.ms-students-watch`.
 * The lists come from ClassWeek (P1: silent for SILENT_AFTER_DAYS, below the
 * critical line on the last completed set, a clear rise over their own
 * baseline) with names already as displayName(). Each name opens the
 * student's page.
 */
export function StudentsToWatch({
  classroomId,
  silent,
  struggling,
  improving,
}: {
  classroomId: string
  silent: ClassWeek['silent_students']
  struggling: ClassWeek['struggling']
  improving: ClassWeek['improving']
}) {
  return (
    <section aria-labelledby="students-watch-title" className="mb-2">
      <h2 id="students-watch-title" className="ms-teacher-section-title">
        Students to watch
      </h2>
      <div className="ms-students-watch">
        <Group
          classroomId={classroomId}
          headingId="watch-silent"
          title="Quiet for 14+ days"
          modifier="silent"
          empty="Nobody — every student has marked work in the last two weeks."
          rows={silent.map((s) => ({
            id: s.id,
            name: s.display_name,
            meta: `${s.days_silent}d`,
            metaLabel: `, no marked work for ${s.days_silent} days`,
          }))}
        />
        <Group
          classroomId={classroomId}
          headingId="watch-struggling"
          title="Struggling on the last set"
          modifier="struggling"
          empty="Nobody fell below the line on the last set."
          rows={struggling.map((s) => ({
            id: s.id,
            name: s.display_name,
            meta: `${Math.round(s.pct)}%`,
            metaLabel: `, ${Math.round(s.pct)}% on the last set`,
          }))}
        />
        <Group
          classroomId={classroomId}
          headingId="watch-improving"
          title="On the way up"
          modifier="improving"
          empty="No clear risers yet — it takes a few weeks of marked work to tell."
          rows={improving.map((s) => ({
            id: s.id,
            name: s.display_name,
            meta: `+${Math.round(s.delta_pct)}`,
            metaLabel: `, up ${Math.round(s.delta_pct)} percentage points`,
          }))}
        />
      </div>
    </section>
  )
}

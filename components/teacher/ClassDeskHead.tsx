import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatInviteCode } from '@/lib/teacher/invite-code'
import { subjectCodeLabel, subjectStamp } from '@/lib/teacher/list-classrooms'
import type { ClassroomSettings } from '@/lib/teacher/types'
import { TeacherDeskHead } from '@/components/teacher/TeacherPageChrome'

export type ClassDeskHeadClassroom = {
  id: string
  name: string
  subject_code: string | null
  year_group: string | null
  invite_code: string | null
  settings: ClassroomSettings
  archived_at: string | null
  /** Active members. */
  studentCount: number
}

/**
 * The head of every class page (docs/TEACHER_SYSTEM_SPEC.md §4 "Class
 * week": name, subject chip, `<code>` invite, demo flag from settings.demo),
 * on the shared `.ms-teacher-desk-head`.
 *
 * Below the head it adds the class's standing notices: the example-data flag
 * for a seeded demo class, and the read-only banner for an archived one
 * (whose invite code no longer works, so it is not shown). A server
 * component; it reads the subject registry for the chip.
 *
 *   <ClassDeskHead classroom={classroom} eyebrow="Sets" note="2 open"
 *     actions={<LoadingLink …>Set work</LoadingLink>} />
 */
export function ClassDeskHead({
  classroom,
  eyebrow = 'Class',
  title,
  note,
  actions,
  titleId,
}: {
  classroom: ClassDeskHeadClassroom
  eyebrow?: string
  /** Defaults to the class name. */
  title?: ReactNode
  /** The handwritten aside under the title (decorative; hidden from assistive tech). */
  note?: ReactNode
  actions?: ReactNode
  titleId?: string
}) {
  const archived = classroom.archived_at !== null
  const code = !archived && classroom.invite_code ? formatInviteCode(classroom.invite_code) : null
  const students = classroom.studentCount

  const lead = (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="ms-teacher-chip">{subjectCodeLabel(classroom.subject_code)}</span>
      {classroom.year_group ? <span>{classroom.year_group}</span> : null}
      <span aria-hidden>·</span>
      <span>
        {students} {students === 1 ? 'student' : 'students'}
      </span>
      {code ? (
        <>
          <span aria-hidden>·</span>
          <span>
            Code{' '}
            <code className="font-mono text-sm font-bold tracking-wider text-[var(--ec-text-primary)]">{code}</code>
          </span>
        </>
      ) : null}
    </span>
  )

  return (
    <>
      <TeacherDeskHead
        eyebrow={eyebrow}
        stamp={subjectStamp(classroom.subject_code)}
        title={title ?? classroom.name}
        titleId={titleId}
        lead={lead}
        note={archived ? 'archived — read-only' : note}
        actions={archived ? undefined : actions}
      />

      {archived ? (
        <p className="ms-teacher-archived-banner" role="status">
          <span className="ms-teacher-chip ms-teacher-chip--archived">Archived</span>
          <span>
            Read-only: students don&apos;t see this class&apos;s sets and nobody can join. Marks handed in while it
            was active are kept.{' '}
            <Link href={`/teacher/classroom/${encodeURIComponent(classroom.id)}/settings`} className="ec-link">
              Restore it in Settings
            </Link>
          </span>
        </p>
      ) : null}

      {classroom.settings.demo ? (
        <p className="ms-teacher-demo-flag mb-6 text-sm text-[var(--ec-text-secondary)]">
          <span className="ms-teacher-chip ms-teacher-chip--demo mr-2">Example data</span>
          The students and marks in this class are simulated — not your real cohort.
        </p>
      ) : null}
    </>
  )
}

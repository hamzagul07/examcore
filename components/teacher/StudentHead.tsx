import type { ReactNode } from 'react'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { TeacherDeskHead } from '@/components/teacher/TeacherPageChrome'
import { composerHref } from '@/components/teacher/assignments/links'
import type { ClassroomMember, StudentQuadrantMetric } from '@/lib/teacher-analytics'
import { relativeDay, shortDate } from '@/lib/teacher/insights/format'
import type { StudentRecordSummary } from '@/lib/teacher/insights/student-record'
import { NO_DATA, percentOrDash } from '@/lib/teacher/stat-display'

/**
 * The top of a teacher's page about one student (spec §4
 * `.../students/[studentId]`): who they are in this class, then three
 * tallies — how accurate their marked work is, how quickly they work, and
 * how they are doing on the class's sets.
 *
 * Every figure is over the class's scoped work only (marked since they
 * joined, in the class subject). With no marked work a figure is unknown,
 * not zero, so it reads as a dash with the reason (lib/teacher/stat-display).
 * When the figures failed to load (`metricsError`) nothing is said about
 * their work at all — "no marked work" beside an error would be a confident
 * false statement.
 *
 * A student who left or was removed keeps their page — the record of who was
 * in the class — but their work is no longer the teacher's to see, so the
 * head says so and shows no figures. A server component.
 */
export function StudentHead({
  classroomId,
  classroomName,
  name,
  firstName,
  member,
  archived,
  metrics,
  record,
  lastMarkedAt,
  metricsError = false,
  nowMs,
  canSetWork,
  reviewsHref,
  headingId = 'student-head-title',
}: {
  classroomId: string
  /** The class's name, for the eyebrow. */
  classroomName: string
  /** Full name (the teacher's own screen). */
  name: string
  /** "Amira" — for the actions. */
  firstName: string
  member: ClassroomMember
  archived: boolean
  /** Their figures from marked work, or null when they have none in scope (or they failed to load). */
  metrics: StudentQuadrantMetric | null
  /** Their record on the class's sets, or null when it could not be read. */
  record: StudentRecordSummary | null
  lastMarkedAt: string | null
  /** The marked-work read failed: `metrics` and `lastMarkedAt` are unknown, not empty. */
  metricsError?: boolean
  /** When the page was computed. */
  nowMs: number
  /** False for an archived class, a student no longer in it, or with v2 off. */
  canSetWork: boolean
  /** The review inbox filtered to this student, or null to hide the link. */
  reviewsHref: string | null
  headingId?: string
}) {
  const active = member.status === 'active'
  const joined = shortDate(member.joined_at, nowMs)
  const endedAt = member.status === 'left' ? member.left_at : member.status === 'removed' ? member.removed_at : null
  const ended = shortDate(endedAt ?? null, nowMs)
  const last = relativeDay(lastMarkedAt, nowMs)

  const lead: ReactNode = active ? (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {joined ? <span>Joined {joined}</span> : null}
      {last || !metricsError ? (
        <>
          {joined ? <span aria-hidden>·</span> : null}
          <span>{last ? `last marked work ${last}` : 'no marked work in this class yet'}</span>
        </>
      ) : null}
    </span>
  ) : (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`ms-teacher-chip ms-teacher-chip--${member.status === 'left' ? 'left' : 'removed'}`}>
        {member.status === 'left' ? 'Left' : 'Removed'}
      </span>
      <span>
        {member.status === 'left' ? 'Left the class' : 'Removed from the class'}
        {ended ? ` on ${ended}` : ''} — their work is no longer shown to you.
      </span>
    </span>
  )

  const actions =
    active && (canSetWork || reviewsHref) ? (
      <>
        {canSetWork ? (
          <LoadingLink
            href={composerHref(classroomId, { students: [member.student_id] })}
            loadingText="Opening…"
            className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2"
          >
            <span className="font-mono text-[11px] font-bold" aria-hidden>
              +
            </span>
            Set work for {firstName}
          </LoadingLink>
        ) : null}
        {reviewsHref ? (
          <LoadingLink
            href={reviewsHref}
            loadingText="Opening…"
            className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2"
          >
            <span className="font-mono text-[11px] font-bold" aria-hidden>
              RV
            </span>
            Their scripts to review
          </LoadingLink>
        ) : null}
      </>
    ) : undefined

  const marked = metrics?.attemptCount ?? 0
  const grade = metrics && metrics.predictedGrade && metrics.predictedGrade !== NO_DATA ? metrics.predictedGrade : null

  return (
    <>
      <TeacherDeskHead
        eyebrow={`Student · ${classroomName}`}
        stamp="STU"
        title={name}
        titleId={headingId}
        lead={lead}
        actions={actions}
      />

      {active && !archived ? (
        <dl className="ms-teacher-tally mb-6">
          <div className="ms-teacher-tally__cell">
            <dt className="ms-teacher-tally__label">Accuracy</dt>
            <dd className="ms-teacher-tally__value">
              {metrics ? (
                percentOrDash(metrics.accuracy, marked)
              ) : (
                <Unknown label={metricsError ? "Their accuracy didn't load" : 'No marked work yet'} />
              )}
            </dd>
            <dd className="mt-2 text-xs text-[var(--ec-text-secondary)]">
              {metricsError
                ? 'didn’t load'
                : marked > 0
                  ? `across ${marked} marked ${marked === 1 ? 'script' : 'scripts'}${grade ? ` · predicted ${grade}` : ''}`
                  : 'no marked work in this subject yet'}
            </dd>
          </div>
          <div className="ms-teacher-tally__cell">
            <dt className="ms-teacher-tally__label">Pace</dt>
            <dd className="ms-teacher-tally__value">
              {metrics?.timePerMark != null ? (
                <>
                  {paceValue(metrics.timePerMark)}
                  <span className="text-base text-[var(--ec-text-secondary)]"> min/mark</span>
                </>
              ) : (
                <Unknown label={metricsError ? "Their pace didn't load" : 'No timed work yet'} />
              )}
            </dd>
            <dd className="mt-2 text-xs text-[var(--ec-text-secondary)]">
              {metricsError ? 'didn’t load' : metrics?.timePerMark != null ? 'over their timed scripts' : 'no timed work yet'}
            </dd>
          </div>
          <div className="ms-teacher-tally__cell">
            <dt className="ms-teacher-tally__label">Sets handed in</dt>
            <dd className="ms-teacher-tally__value">
              {record ? (
                <>
                  {record.handedIn}
                  <span className="text-base text-[var(--ec-text-secondary)]"> of {record.sets}</span>
                </>
              ) : (
                <Unknown label="Their sets didn't load" />
              )}
            </dd>
            <dd className="mt-2 text-xs text-[var(--ec-text-secondary)]">
              {record ? setsLine(record) : 'their sets didn’t load'}
            </dd>
          </div>
        </dl>
      ) : null}

      {active && !archived && metrics?.biggestDeficit ? (
        <p className="mb-8 text-sm text-[var(--ec-text-secondary)]">
          <span className="ec-label-tech ec-score-low mr-2">Weakest topic</span>
          <span className="font-semibold text-[var(--ec-text-primary)]">{metrics.biggestDeficit.name}</span>{' '}
          <span className="font-mono">{metrics.biggestDeficit.code}</span> ·{' '}
          <span className="tabular-nums">{Math.round(metrics.biggestDeficit.percentage)}%</span>
          {metrics.coverage != null ? ` · ${Math.round(metrics.coverage)}% of the syllabus marked` : ''}
        </p>
      ) : null}
    </>
  )
}

/** Minutes per mark as the risk matrix prints them: one decimal under 10. */
function paceValue(minutes: number): string {
  return minutes < 10 ? minutes.toFixed(1) : String(Math.round(minutes))
}

function setsLine(r: StudentRecordSummary): string {
  if (r.sets === 0) return 'no sets for them yet'
  const parts: string[] = []
  if (r.late > 0) parts.push(`${r.late} late`)
  if (r.missing > 0) parts.push(`${r.missing} missing`)
  if (r.open > 0) parts.push(`${r.open} still open`)
  const other = r.sets - r.handedIn - r.missing - r.open
  if (other > 0) parts.push(`${other} excused or part done`)
  return parts.length > 0 ? parts.join(' · ') : 'all handed in on time'
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

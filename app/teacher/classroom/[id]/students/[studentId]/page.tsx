import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { runAfterResponse } from '@/lib/after-response'
import { createServiceClient } from '@/lib/supabase/service'
import { computeStudentQuadrants, type StudentQuadrantMetric } from '@/lib/teacher-analytics'
import { displayName } from '@/lib/teacher/display-name'
import type { FeedbackNote } from '@/lib/teacher/feedback'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { firstNameOf, relativeDay } from '@/lib/teacher/insights/format'
import type { StudentHistoryRow } from '@/lib/teacher/insights/history'
import { teacherOmniContext } from '@/lib/teacher/insights/omni'
import {
  auditStudentView,
  findStudentAttemptInScope,
  loadFeedbackNotes,
  loadStudentAttempts,
  loadStudentDue,
  loadStudentHistory,
  loadStudentInClass,
  loadStudentSets,
  type StudentHistoryPage,
} from '@/lib/teacher/insights/server'
import {
  buildStudentSetRecord,
  summariseStudentRecord,
  type StudentSetRecordRow,
} from '@/lib/teacher/insights/student-record'
import type { StudentDueTopic } from '@/lib/teacher/cohort-due'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'
import { ClassTabs } from '@/components/teacher/ClassTabs'
import { FeedbackComposer } from '@/components/teacher/FeedbackComposer'
import { StudentAssignmentRecord } from '@/components/teacher/StudentAssignmentRecord'
import { StudentAttemptHistory } from '@/components/teacher/StudentAttemptHistory'
import { StudentDueList } from '@/components/teacher/StudentDueList'
import { StudentHead } from '@/components/teacher/StudentHead'
import { TeacherBackLink, TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { reviewHref } from '@/components/teacher/assignments/links'
import { firstParam, requestTimeZone, requireClassContext } from '../../assignments/_lib/context'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string; studentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// One lookup per request, shared by generateMetadata and the page.
const studentInClass = cache((supabase: SupabaseClient, classroomId: string, studentId: string) =>
  loadStudentInClass(supabase, classroomId, studentId)
)

function pagePath(id: string, studentId: string): string {
  return `/teacher/classroom/${encodeURIComponent(id)}/students/${encodeURIComponent(studentId)}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, studentId } = await params
  const { supabase, classroom } = await requireClassContext(id, pagePath(id, studentId))
  const student = await studentInClass(supabase, classroom.id, studentId).catch(() => null)
  // "Amira K.", not the full name: a tab title ends up in browser history and sync.
  return { title: student ? `${displayName(student.full_name)} · ${classroom.name}` : classroom.name }
}

/** A section's result, or the reason it is missing — so one failed read never blanks the page. */
type Loaded<T> = { ok: true; value: T } | { ok: false }

function settle<T>(label: string, ctx: Record<string, string>, work: Promise<T>): Promise<Loaded<T>> {
  return work.then(
    (value) => ({ ok: true as const, value }),
    (err: unknown) => {
      console.error(`[teacher/student] ${label} failed`, {
        ...ctx,
        error: err instanceof Error ? err.message : String(err),
      })
      return { ok: false as const }
    }
  )
}

/**
 * A teacher's page about one student (docs/TEACHER_SYSTEM_SPEC.md §4
 * `.../students/[studentId]`): StudentHead → StudentAssignmentRecord →
 * StudentAttemptHistory → StudentDueList → FeedbackComposer.
 *
 * A server component. It proves ownership of the class (requireClassContext),
 * then that the student is a member of it, and reads only THIS student's
 * rows — never the whole class (spec §10 P7). Each section loads on its own
 * and fails on its own, in words.
 *
 * What is shown follows the classroom privacy rule (spec §8): work marked
 * since the student joined, in the class subject, while they are an active
 * member. A student who left or was removed keeps a page that says so, with
 * nothing of theirs on it. An archived class shows only the hand-ins it kept.
 *
 * Opening a student's record is written to the audit log (`view_student`),
 * once per viewing session, after the response.
 *
 * `?attempt=<id>` puts the note composer on that script (it must be one of
 * this student's in-scope scripts); otherwise it is on their newest one.
 */
export default async function StudentPage({ params, searchParams }: Props) {
  const [{ id, studentId }, sp] = await Promise.all([params, searchParams])
  const { supabase, userId, classroom } = await requireClassContext(id, pagePath(id, studentId))

  const student = await studentInClass(supabase, classroom.id, studentId)
  if (!student) notFound()

  const { member } = student
  const v2 = isTeacherV2()
  const archived = classroom.archived_at !== null
  const active = member.status === 'active'
  // Their live work: an active member of a class that is still running.
  const live = active && !archived
  // Service client only now that ownership and membership are proven.
  const admin = createServiceClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const nowMs = now.getTime()
  const ctx = { classroomId: classroom.id, studentId: member.student_id }

  const fullName = student.full_name?.trim() || 'Unnamed student'
  const firstName = firstNameOf(displayName(student.full_name))
  // Who the actions address. An unnamed student is "this student" there, not
  // displayName()'s fallback: "Set work for Student" reads as a typo.
  const addressName = student.full_name?.trim() ? firstName : 'this student'
  const requestedAttempt = firstParam(sp.attempt)

  const [timeZone, attemptsR, setsR, historyR, dueR, requestedR] = await Promise.all([
    requestTimeZone(),
    live
      ? settle('figures', ctx, loadStudentAttempts(supabase, admin, classroom, member))
      : Promise.resolve<Loaded<null>>({ ok: true, value: null }),
    active
      ? settle(
          'sets',
          ctx,
          // An archived class's hand-ins are only readable as the service role
          // (RLS drops students of archived classes); ownership is proven.
          loadStudentSets(archived ? admin : supabase, classroom.id, member.student_id).then((sets) =>
            buildStudentSetRecord(sets, member, now)
          )
        )
      : Promise.resolve<Loaded<StudentSetRecordRow[]>>({ ok: true, value: [] }),
    live
      ? settle('history', ctx, loadStudentHistory(supabase, admin, classroom, member, null))
      : Promise.resolve<Loaded<StudentHistoryPage | null>>({ ok: true, value: null }),
    live
      ? settle('due topics', ctx, loadStudentDue(admin, classroom, member))
      : Promise.resolve<Loaded<StudentDueTopic[]>>({ ok: true, value: [] }),
    live && v2 && requestedAttempt
      ? settle('requested script', ctx, findStudentAttemptInScope(supabase, admin, classroom, member, requestedAttempt))
      : Promise.resolve<Loaded<StudentHistoryRow | null>>({ ok: true, value: null }),
  ])

  // Something of theirs is on the page: that is a view of their record.
  if (active) {
    runAfterResponse('teacher view_student audit', () =>
      auditStudentView({
        actorId: userId,
        classroomId: classroom.id,
        studentId: member.student_id,
        surface: 'student_page',
      })
    )
  }

  let metrics: StudentQuadrantMetric | null = null
  let lastMarkedAt: string | null = null
  if (attemptsR.ok && attemptsR.value) {
    const { attempts } = attemptsR.value
    // One student: no class median, so the quadrant is not used here — only the figures.
    metrics =
      computeStudentQuadrants(attempts, [member.student_id], classroom.subject_code, classroom.board ?? '')[0] ?? null
    lastMarkedAt = attempts[0]?.created_at ?? null
  }
  const recordRows = setsR.ok ? setsR.value : null

  // The script the note composer is on: the one asked for, else the newest.
  const history = historyR.ok ? historyR.value : null
  const noteTarget: StudentHistoryRow | null =
    (requestedR.ok ? requestedR.value : null) ?? history?.attempts[0] ?? null
  const notesR: Loaded<FeedbackNote[]> | null =
    live && v2 && noteTarget ? await settle('notes', ctx, loadFeedbackNotes(supabase, noteTarget.id)) : null

  const requestMissed = Boolean(requestedAttempt && requestedR.ok && !requestedR.value)

  const reviewsLink = live
    ? `/teacher/reviews?${new URLSearchParams({ classroom_id: classroom.id, student_id: member.student_id }).toString()}`
    : null
  const unreadable = 'Reload the page to try again — the other sections on this page loaded normally.'

  return (
    <TeacherPageContainer className="ms-teacher-page max-w-5xl">
      <OmniAIBridge context={teacherOmniContext({ classroomId: classroom.id, view: 'student' })} />
      <TeacherBackLink href={`/teacher/classroom/${encodeURIComponent(classroom.id)}/students`}>
        ← Class roster
      </TeacherBackLink>

      <StudentHead
        classroomId={classroom.id}
        classroomName={classroom.name}
        name={fullName}
        firstName={addressName}
        member={member}
        archived={archived}
        metrics={metrics}
        record={recordRows ? summariseStudentRecord(recordRows) : null}
        lastMarkedAt={lastMarkedAt}
        metricsError={!attemptsR.ok}
        nowMs={nowMs}
        canSetWork={v2 && live}
        reviewsHref={reviewsLink}
      />
      <ClassTabs classroomId={classroom.id} current="students" v2={v2} />

      {archived && active ? (
        <p className="ms-teacher-archived-banner" role="status">
          <span className="ms-teacher-chip ms-teacher-chip--archived">Archived</span>
          <span>This class is archived: only the marks {firstName} handed in while it was active are shown.</span>
        </p>
      ) : null}

      {attemptsR.ok ? null : (
        <div className="ms-teacher-error mb-8" role="alert">
          <p className="ms-teacher-error__title">{firstName}&apos;s figures didn&apos;t load</p>
          <p className="ms-teacher-error__body">{unreadable}</p>
        </div>
      )}

      {active ? (
        <StudentAssignmentRecord
          classroomId={classroom.id}
          rows={recordRows ?? []}
          error={recordRows ? null : unreadable}
          firstName={firstName}
          timeZone={timeZone}
          nowIso={nowIso}
          archived={archived}
        />
      ) : null}

      {live ? (
        <StudentAttemptHistory
          classroomId={classroom.id}
          studentId={member.student_id}
          firstName={firstName}
          initial={history}
          error={historyR.ok ? null : unreadable}
          selectedAttemptId={notesR ? (noteTarget?.id ?? null) : null}
          canNote={v2 && live}
          nowMs={nowMs}
        />
      ) : null}

      {live ? (
        <StudentDueList
          topics={dueR.ok ? dueR.value : []}
          error={dueR.ok ? null : unreadable}
          firstName={firstName}
          nowIso={nowIso}
        />
      ) : null}

      {live && v2 && noteTarget && notesR ? (
        <section id="feedback" className="mb-8 scroll-mt-24" aria-labelledby="student-feedback-title">
          <h2 id="student-feedback-title" className="ms-teacher-section-title">
            A note to {addressName}
          </h2>
          <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
            On <span className="font-semibold text-[var(--ec-text-primary)]">{noteTarget.work}</span>
            {relativeDay(noteTarget.created_at, nowMs) ? ` from ${relativeDay(noteTarget.created_at, nowMs)}` : ''} —{' '}
            <Link href={reviewHref(noteTarget.id)} className="ec-link">
              open the script
            </Link>
            . {firstName} sees it on their marked script. Choose another script with its &ldquo;Note&rdquo; button above.
          </p>
          {requestMissed ? (
            <p className="mb-4 text-sm text-[var(--ec-text-secondary)]" role="status">
              The script in the link isn&apos;t one of {firstName}&apos;s in this class, so this is their newest one.
            </p>
          ) : null}
          {notesR.ok ? (
            <FeedbackComposer
              attemptId={noteTarget.id}
              classroomId={classroom.id}
              studentFirstName={firstName}
              notes={notesR.value}
              labelledBy="student-feedback-title"
            />
          ) : (
            <div className="ms-teacher-error" role="alert">
              <p className="ms-teacher-error__title">Your notes on this script didn&apos;t load</p>
              <p className="ms-teacher-error__body">{unreadable}</p>
            </div>
          )}
        </section>
      ) : null}

    </TeacherPageContainer>
  )
}

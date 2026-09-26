import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher } from '@/lib/teacher-auth'
import { capForTier, teacherMarkCap } from '@/lib/billing/caps'
import { classBonusFor } from '@/lib/billing/teacher-seat'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { teacherOmniContext } from '@/lib/teacher/insights/omni'
import {
  isUuid,
  loadClassRoster,
  loadTeacherClassroom,
  subjectCodeGroups,
  subjectCodeLabel,
  suggestSubjectCodes,
} from '@/lib/teacher/list-classrooms'
import { loadSeatState, seatCardState } from '@/lib/teacher/seat-grant'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { ClassDeskHead } from '@/components/teacher/ClassDeskHead'
import {
  ClassExportButtons,
  ClassroomDangerZone,
  ClassroomSettingsForm,
} from '@/components/teacher/ClassroomSettingsForm'
import { InviteCard } from '@/components/teacher/InviteCard'
import { RosterList } from '@/components/teacher/RosterList'
import { TeacherSeatRequestCard } from '@/components/teacher/TeacherSeatRequestCard'
import { ClassTabs } from '@/components/teacher/ClassTabs'
import { OmniAIBridge } from '@/components/omni-ai/OmniAIBridge'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Class settings' }

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string
  title: string
  lead?: string
  children: ReactNode
}) {
  return (
    <section className="ms-teacher-settings__section" aria-labelledby={id}>
      <header className="ms-teacher-settings__head">
        <div>
          <h2 id={id} className="ms-teacher-settings__title">
            {title}
          </h2>
          {lead ? <p className="ms-teacher-settings__lead">{lead}</p> : null}
        </div>
      </header>
      {children}
    </section>
  )
}

/**
 * Class settings (spec §4): details, the invite code and "New code", the
 * roster with Remove, CSV export, and archive / restore / delete. Loaded once
 * on the server — the class (RLS; notFound() for anyone else's), its roster
 * (teacher_roster_profiles) and the teacher's seat; everything that changes
 * something is a client island calling the classroom routes.
 */
export default async function ClassroomSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/signin?next=${encodeURIComponent(`/teacher/classroom/${id}/settings`)}`)

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) redirect('/dashboard')

  const classroom = isUuid(id) ? await loadTeacherClassroom(supabase, user.id, id) : null
  if (!classroom) notFound()

  // Service client only now that the class is proven to be the caller's.
  const service = createServiceClient()
  const [roster, seat] = await Promise.all([
    loadClassRoster(supabase, service, classroom),
    loadSeatState(service, user.id).catch(() => ({ verifiedAt: null, latest: null })),
  ])

  const archived = classroom.archived_at !== null
  const v2 = isTeacherV2()
  const seatState = seatCardState(seat)
  // Marks a month each student of a verified teacher's live class gets —
  // computed by the same rule billing enforces (classBonusFor: the
  // TEACHER_CLASS_STUDENT_BONUS variable, off with v2 off), so the promise on
  // this page is the allowance the student actually gets.
  const classBonus = classBonusFor({ inVerifiedClassroom: true, isTeacher: false })
  const suggested = suggestSubjectCodes({
    board: classroom.board,
    level: classroom.level,
    subject: classroom.subject,
    current: classroom.subject_code,
  }).map((code) => ({ code, label: subjectCodeLabel(code) }))
  const groups = subjectCodeGroups(classroom.board).map((g) => ({
    label: g.label,
    options: g.codes.map((code) => ({ code, label: subjectCodeLabel(code) })),
  }))
  const activeMembers = roster.ok
    ? roster.students.filter((s) => s.status === 'active').length
    : classroom.studentCount

  return (
    <TeacherPageContainer className="ms-teacher-page">
      <OmniAIBridge context={teacherOmniContext({ classroomId: classroom.id, view: 'settings' })} />
      {/* The same head as every other class tab (the tabs are the way back). */}
      <ClassDeskHead classroom={{ ...classroom, studentCount: activeMembers }} eyebrow="Settings" banners={false} />
      <ClassTabs classroomId={classroom.id} current="settings" v2={v2} />

      <div className="ms-teacher-settings">
        {archived ? (
          <p className="ms-teacher-archived-banner" role="status">
            <span className="ms-teacher-chip ms-teacher-chip--archived">Archived</span>
            Nobody can join and students don&apos;t see its sets. Restore it at the bottom of this page.
          </p>
        ) : null}

        {classroom.settings.demo ? (
          <p className="ms-teacher-demo-flag text-sm">
            <span className="ms-teacher-chip ms-teacher-chip--demo mr-2">Example data</span>
            The students and marks in this class are simulated. Archive and delete it when you have seen
            enough.
          </p>
        ) : null}

        {seatState.kind === 'hidden' ? (
          classBonus > 0 ? (
            <p className="ms-teacher-allowance">
              <span className="ms-teacher-allowance__figure" aria-hidden>
                +{classBonus}
              </span>
              <span>
                Your students get{' '}
                <strong>
                  +{classBonus} mark{classBonus === 1 ? '' : 's'} a month
                </strong>{' '}
                from this class, on top of their own allowance, while they are in it.
              </span>
            </p>
          ) : null
        ) : (
          <TeacherSeatRequestCard state={seatState} teacherCap={teacherMarkCap()} freeCap={capForTier('free')} />
        )}

        <Section id="settings-details" title="Details">
          <ClassroomSettingsForm
            classroom={{
              id: classroom.id,
              name: classroom.name,
              description: classroom.description,
              year_group: classroom.year_group,
              subject_code: classroom.subject_code,
              settings: classroom.settings,
              archived_at: classroom.archived_at,
            }}
            suggested={suggested}
            groups={groups}
          />
        </Section>

        <Section
          id="settings-invite"
          title="Invite code"
          lead="Replace the code if it has been shared somewhere it shouldn't have been — the old one stops working at once."
        >
          {archived || !classroom.invite_code ? (
            <p className="text-sm text-[var(--ec-text-secondary)]">
              {archived ? 'An archived class has no working code. Restore it to invite students.' : 'This class has no code yet.'}
            </p>
          ) : (
            <InviteCard classroom={{ invite_code: classroom.invite_code }} classroomId={classroom.id} canRegenerate />
          )}
        </Section>

        <Section
          id="settings-roster"
          title="Class list"
          lead="Everyone who has been in the class. Removing a student takes their work off your desk at once."
        >
          {roster.ok ? (
            <RosterList
              classroomId={classroom.id}
              students={roster.students}
              canRemove={!archived}
              nowMs={Date.now()}
            />
          ) : (
            <div className="ms-teacher-error" role="alert">
              <p className="ms-teacher-error__title">Couldn&apos;t load the class list</p>
              <p className="ms-teacher-error__body">Reload the page to try again.</p>
            </div>
          )}
        </Section>

        <Section
          id="settings-export"
          title="Export marks"
          lead="A CSV for your markbook: students' display names (first name and initial) and marks, no email addresses, active students only."
        >
          {archived ? (
            <p className="text-sm text-[var(--ec-text-secondary)]">Restore the class to export its marks.</p>
          ) : (
            <ClassExportButtons classroomId={classroom.id} />
          )}
        </Section>

        <section className="ms-teacher-danger" aria-labelledby="settings-danger">
          <h2 id="settings-danger" className="ms-teacher-settings__title mb-3">
            Archive or delete
          </h2>
          <ClassroomDangerZone
            classroom={{
              id: classroom.id,
              name: classroom.name,
              archived_at: classroom.archived_at,
              activeMembers,
            }}
          />
        </section>
      </div>
    </TeacherPageContainer>
  )
}

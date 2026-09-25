import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSyllabusTree } from '@/lib/syllabi'
import { getSubjectPaperStructure } from '@/lib/subject-papers'
import { createServiceClient } from '@/lib/supabase/service'
import { loadAssignment } from '@/lib/teacher/assignments'
import { isTeacherV2 } from '@/lib/teacher/flags'
import { subjectCodeLabel } from '@/lib/teacher/list-classrooms'
import { loadSeatState } from '@/lib/teacher/seat-grant'
import { getRosterProfiles } from '@/lib/teacher-classroom-data'
import { TeacherBackLink, TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { ClassDeskHead } from '@/components/teacher/ClassDeskHead'
import { ClassTabs } from '@/components/teacher/ClassTabs'
import { AssignmentComposer, type ComposerStudent } from '@/components/teacher/assignments/AssignmentComposer'
import {
  draftToComposerState,
  paperChoices,
  parseComposerPrefill,
  topicIndex,
  topicTree,
  type ComposerState,
} from '@/components/teacher/assignments/composer-model'
import { setHref, setsHref } from '@/components/teacher/assignments/links'
import { firstParam, requireClassContext } from '../_lib/context'
import { requireSetContext } from '../_lib/set-context'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  if (!isTeacherV2()) return { title: 'Set work' }
  const { classroom } = await requireClassContext(id, `/teacher/classroom/${id}/assignments/new`)
  return { title: `Set work · ${classroom.name}` }
}

/**
 * Set work (docs/TEACHER_SYSTEM_SPEC.md §4 `.../assignments/new`). The page
 * loads what the composer offers — the class's active students (names via
 * teacher_roster_profiles), its syllabus tree, the papers and sessions on
 * file for its subject, whether the teacher's seat is verified (for the
 * allowance note, §7) — and reads the card link that opened it
 * (`?source=&codes=&students=`) into the composer's first state. The
 * composer island does the rest.
 *
 * `?draft=<id>` reopens a saved draft of this class in the composer (a set
 * that has been published goes to its own page instead).
 *
 * A class without a syllabus cannot take work (every set is subject-scoped),
 * and an archived one is read-only; both get a page that says what to do.
 */
export default async function NewSetPage({ params, searchParams }: Props) {
  if (!isTeacherV2()) notFound()
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const { supabase, userId, classroom } = await requireClassContext(id, `/teacher/classroom/${id}/assignments/new`)

  const draftId = firstParam(sp.draft)
  const head = (
    <>
      <TeacherBackLink href={draftId ? setHref(classroom.id, draftId) : setsHref(classroom.id)}>
        {draftId ? '<- Back to the draft' : '<- Sets'}
      </TeacherBackLink>
      <ClassDeskHead classroom={classroom} eyebrow={draftId ? 'Edit draft' : 'Set work'} />
      <ClassTabs classroomId={classroom.id} current="sets" />
    </>
  )

  if (classroom.archived_at !== null) {
    return <TeacherPageContainer className="ms-teacher-page">{head}</TeacherPageContainer>
  }

  const subjectCode = classroom.subject_code
  if (!subjectCode) {
    return (
      <TeacherPageContainer className="ms-teacher-page">
        {head}
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon" aria-hidden>
            SYL
          </span>
          <h2 className="ms-teacher-empty__title">Choose this class&apos;s syllabus first</h2>
          <p className="ms-teacher-empty__body">
            Every set is drawn from one syllabus — its papers, its topics, and the marks your students hand in
            against it. Pick the syllabus in Settings, then come back to set work.
          </p>
          <div className="ms-teacher-empty__actions">
            <Link
              href={`/teacher/classroom/${encodeURIComponent(classroom.id)}/settings`}
              className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center"
            >
              Open Settings
            </Link>
          </div>
        </div>
      </TeacherPageContainer>
    )
  }

  // Service client only now that the class is proven to be the caller's:
  // the seat flag is not readable by its owner under RLS.
  const [roster, seat] = await Promise.all([
    getRosterProfiles(supabase, classroom.id),
    loadSeatState(createServiceClient(), userId).catch((err: unknown) => {
      console.error('[teacher/composer] seat state failed:', err instanceof Error ? err.message : err)
      return { verifiedAt: null, latest: null }
    }),
  ])

  const students: ComposerStudent[] = roster
    .filter((r) => r.status === 'active')
    .map((r) => ({ id: r.id, name: r.full_name?.trim() || 'Unnamed student' }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id))

  const tree = topicTree(getSyllabusTree(subjectCode))
  const prefill = parseComposerPrefill(sp, {
    topics: topicIndex(tree),
    activeStudentIds: new Set(students.map((s) => s.id)),
  })

  let draft: { assignmentId: string; initial: ComposerState; targetLabel: string } | undefined
  if (draftId) {
    // The draft must be this class's (a 404 otherwise); the service client
    // exists only after that RLS read. Same arguments as the class gate above,
    // so its cached lookup is reused.
    const { admin } = await requireSetContext(id, draftId, `/teacher/classroom/${id}/assignments/new`)
    const loaded = await loadAssignment(supabase, admin, draftId)
    if (!loaded) notFound()
    if (loaded.assignment.published_at || loaded.assignment.archived_at) redirect(setHref(classroom.id, draftId))
    const picked =
      loaded.assignment.target === 'students'
        ? loaded.progress.students.filter((s) => s.membership === 'active').map((s) => s.student_id)
        : []
    const nameOf = new Map(students.map((s) => [s.id, s.name]))
    const pickedNames = picked.map((sid) => nameOf.get(sid)).filter((n): n is string => Boolean(n))
    draft = {
      assignmentId: loaded.assignment.id,
      initial: draftToComposerState({ assignment: loaded.assignment, items: loaded.items, studentIds: picked }),
      targetLabel:
        loaded.assignment.target === 'all'
          ? `The whole class (${students.length} ${students.length === 1 ? 'student' : 'students'}).`
          : `${picked.length} picked ${picked.length === 1 ? 'student' : 'students'}${
              pickedNames.length ? `: ${pickedNames.slice(0, 6).join(', ')}${pickedNames.length > 6 ? `, +${pickedNames.length - 6}` : ''}` : ''
            }.`,
    }
  }

  return (
    <TeacherPageContainer className="ms-teacher-page">
      {head}
      <div className="mx-auto max-w-3xl">
        <AssignmentComposer
          classroomId={classroom.id}
          subjectCode={subjectCode}
          subjectLabel={subjectCodeLabel(subjectCode)}
          students={students}
          papers={paperChoices(getSubjectPaperStructure(subjectCode), subjectCode)}
          topics={tree}
          prefill={prefill}
          teacherVerified={seat.verifiedAt !== null}
          draft={draft}
        />
      </div>
    </TeacherPageContainer>
  )
}

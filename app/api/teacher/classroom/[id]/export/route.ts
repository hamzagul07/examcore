import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher } from '@/lib/teacher-auth'
import { auditLog } from '@/lib/teacher/notify'
import { isUuid, loadTeacherClassroom, type TeacherClassroomRow } from '@/lib/teacher/list-classrooms'
import {
  MAX_EXPORT_ROWS,
  buildAssignmentsCsv,
  buildAttemptsCsv,
  contentDisposition,
  csvFilename,
  csvSetFilename,
  parseExportScope,
  toCsv,
  type ExportStudent,
} from '@/lib/teacher/export-csv'
import {
  getClassroomAttempts,
  getRosterProfiles,
  hydrateSets,
  loadPublishedSets,
  MAX_ATTEMPT_LIMIT,
} from '@/lib/teacher-classroom-data'

export const dynamic = 'force-dynamic'

type Built = { header: readonly string[]; rows: unknown[][]; truncated: boolean }

/**
 * One row per active student per published set, from the RLS client — every
 * set, or just `onlySetId` (the set page's Export). Null when that set is not
 * one of this class's published sets.
 */
async function assignmentsCsv(
  supabase: SupabaseClient,
  classroomId: string,
  students: ExportStudent[],
  onlySetId: string | null
): Promise<(Built & { setTitle: string | null }) | null> {
  // Hand-ins are read under the teacher's RLS client on purpose: the policy
  // returns current (active) members' rows only — the same people `students`
  // holds — so nothing about a departed student can reach the file.
  const published = await loadPublishedSets(supabase, [classroomId])
  const chosen = onlySetId ? published.filter((s) => s.id === onlySetId) : published
  if (onlySetId && chosen.length === 0) return null
  const sets = await hydrateSets(supabase, chosen)
  const built = buildAssignmentsCsv({
    students,
    assignments: sets,
    items: sets.flatMap((s) => s.items),
    submissions: sets.flatMap((s) => s.submissions),
    flags: sets.flatMap((s) => s.flags),
  })
  return { ...built, setTitle: onlySetId ? (chosen[0]?.title ?? null) : null }
}

/** Every attempt in the class's view: active members, since joining, class subject. */
async function attemptsCsv(
  supabase: SupabaseClient,
  classroom: TeacherClassroomRow,
  students: ExportStudent[]
): Promise<Built> {
  const { attempts, truncated } = await getClassroomAttempts(supabase, classroom.id, {
    subjectCode: classroom.subject_code,
    withMarking: false,
    limit: Math.min(MAX_ATTEMPT_LIMIT, MAX_EXPORT_ROWS),
    // Service client only for the banked question's paper / session / number
    // (never scheme text), which RLS hides from the teacher. Ownership was
    // proven by the caller.
    admin: createServiceClient(),
  })

  // Name the set an attempt was marked for, when it is one of this class's.
  const sets = await hydrateSets(supabase, await loadPublishedSets(supabase, [classroom.id]))
  const setTitleByItem = new Map<string, string>()
  for (const set of sets) for (const item of set.items) setTitleByItem.set(item.id, set.title)

  const built = buildAttemptsCsv({ students, attempts, setTitleByItem })
  return { ...built, truncated: built.truncated || truncated }
}

/**
 * GET `?scope=assignments|attempts[&assignment_id=<set>]` → a CSV download of
 * the class markbook (with `assignment_id`, just that set's rows).
 *
 * Active members only, display names only ("Amira K."), no emails — the file
 * leaves the platform (spec §8). `assignments` is one row per student per
 * published set; `attempts` is every marked attempt in the class's view (the
 * class subject, since each student joined). Every export is audited.
 *
 * An archived class is refused rather than exported empty: archiving closes
 * the teacher's read access, and a blank file would look like lost marks.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const search = new URL(request.url).searchParams
  const scope = parseExportScope(search.get('scope'))
  if (!scope) {
    return NextResponse.json({ error: 'scope must be assignments or attempts', field: 'scope' }, { status: 400 })
  }
  const rawSetId = search.get('assignment_id')
  const setId = rawSetId ? (isUuid(rawSetId) ? rawSetId.toLowerCase() : null) : null
  if (rawSetId && (!setId || scope !== 'assignments')) {
    return NextResponse.json(
      { error: 'assignment_id must be a set id, with scope=assignments', field: 'assignment_id' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) return NextResponse.json({ error: 'Not a teacher' }, { status: 403 })

  const classroom = isUuid(id) ? await loadTeacherClassroom(supabase, user.id, id) : null
  if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })

  if (classroom.archived_at) {
    return NextResponse.json({ error: 'This class is archived. Restore it to export its marks.' }, { status: 409 })
  }

  let built: Built
  let setTitle: string | null = null
  let students: ExportStudent[]
  try {
    // Names from the roster RPC only; non-active members never reach the file.
    students = (await getRosterProfiles(supabase, id))
      .filter((p) => p.status === 'active')
      .map((p) => ({ id: p.id, full_name: p.full_name, joined_at: p.joined_at }))
    if (scope === 'assignments') {
      const one = await assignmentsCsv(supabase, id, students, setId)
      if (!one) return NextResponse.json({ error: 'Set not found', field: 'assignment_id' }, { status: 404 })
      built = one
      setTitle = one.setTitle
    } else {
      built = await attemptsCsv(supabase, classroom, students)
    }
  } catch (err) {
    console.error('[teacher/export] build failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not build the export. Try again.' }, { status: 500 })
  }

  await auditLog({
    actorId: user.id,
    classroomId: id,
    action: 'export_csv',
    meta: {
      scope,
      ...(setId ? { assignment_id: setId } : {}),
      rows: built.rows.length,
      students: students.length,
      truncated: built.truncated,
    },
  })

  return new Response(toCsv(built.header, built.rows), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': contentDisposition(
        setTitle !== null ? csvSetFilename(classroom.name, setTitle) : csvFilename(classroom.name, scope)
      ),
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      // Lets the page say the file hit the row ceiling.
      ...(built.truncated ? { 'X-Export-Truncated': '1' } : {}),
    },
  })
}

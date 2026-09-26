/**
 * The teacher desk (docs/TEACHER_SYSTEM_SPEC.md §4 "Teacher desk";
 * GET /api/teacher/overview → TeacherOverview).
 *
 * One slip per class plus the "Needs you" strip. Definitions, all at `now`:
 *
 *   members           active memberships.
 *   open_assignments  published sets whose status is 'open' (assignmentStatus).
 *   due_this_week     open sets due in the current ISO week (UTC, Mon–Sun) —
 *                     including ones due earlier this week, still in grace.
 *   unreviewed        hand-ins (attempt attached) on published sets that no
 *                     teacher has confirmed or re-marked. A flag leaves a
 *                     script unreviewed on purpose.
 *   late_students     students OVERDUE on an open set: an active member it is
 *                     for, not excused, past their own deadline (the later of
 *                     due_at and any extension), with at least one item not
 *                     handed in, and who joined before that deadline. These
 *                     are the students to chase; a student who handed in
 *                     late is done and is counted on the set, not here.
 *   headline_gap      headlineGapText of the last completed set's hand-ins
 *                     (lib/teacher/week.ts pickLastCompletedSet).
 *   silent class      has active members, has had them for SILENT_AFTER_DAYS,
 *                     and none of them has marked work in the class's
 *                     subject in that time.
 *
 * Archived classes are listed (the desk shows them under a disclosure) with
 * their member count only: nothing about them needs the teacher, so they add
 * nothing to "Needs you". `late_students` in needs_you counts each student
 * once however many classes they are late in.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  assignmentStatus,
  effectiveDueAt,
  HANDED_IN_STATES,
} from '@/lib/teacher/assignment-status'
import { buildCohortGapReport, headlineGapText } from '@/lib/teacher/cohort-gaps'
import type { TeacherOverview } from '@/lib/teacher/types'
import {
  scopeClassroomAttempts,
  type ClassroomAttempt,
  type ClassroomMember,
} from '@/lib/teacher-analytics'
import {
  countSubmissions,
  fetchAllFiltered,
  getMembersForClassrooms,
  hydrateSets,
  loadAttemptRows,
  loadAttemptsByIds,
  loadPublishedSets,
  MAX_ATTEMPT_LIMIT,
  type ClassSet,
  type SetRow,
} from '@/lib/teacher-classroom-data'
import {
  currentIsoWeek,
  DAY_MS,
  pickLastCompletedSet,
  setStudentStates,
  SILENT_AFTER_DAYS,
} from '@/lib/teacher/week'

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/** Students overdue on one set at `now` (see the module definitions). */
export function overdueStudentIds(
  set: ClassSet,
  members: readonly ClassroomMember[],
  now: Date
): string[] {
  if (assignmentStatus(set, now) !== 'open') return []
  if (set.items.length === 0) return []
  const nowMs = now.getTime()
  const out: string[] = []
  // Names are irrelevant to who is overdue.
  const states = setStudentStates(set, members, new Map())
  const joinedAt = new Map(members.map((m) => [m.student_id, toMs(m.joined_at)]))
  for (const state of states) {
    if (state.membership !== 'active' || state.excused) continue
    const deadline = toMs(effectiveDueAt(set.due_at, state.extended_due_at))
    if (deadline === null || deadline > nowMs) continue
    const joined = joinedAt.get(state.student_id) ?? null
    // Joined at or after the deadline: it was never theirs to hand in on time.
    if (joined === null || joined >= deadline) continue
    const complete = state.items.every((i) => HANDED_IN_STATES.has(i.state))
    if (!complete) out.push(state.student_id)
  }
  return out.sort()
}

/** Whether a class has gone quiet (see the module definitions). */
export function isSilentClass(
  members: readonly ClassroomMember[],
  lastActivityAt: string | null,
  now: Date
): boolean {
  const joins = members
    .filter((m) => m.status === 'active')
    .map((m) => toMs(m.joined_at))
    .filter((ms): ms is number => ms !== null)
  if (joins.length === 0) return false
  const since = Math.max(Math.min(...joins), toMs(lastActivityAt) ?? -Infinity)
  return now.getTime() - since >= SILENT_AFTER_DAYS * DAY_MS
}

export type OverviewClassInput = {
  id: string
  name: string
  subject_code: string | null
  archived_at: string | null
  /** Every membership row of the class, any status. */
  members: readonly ClassroomMember[]
  /** Hydrated sets: at least every open set of the class. */
  sets: readonly ClassSet[]
  unreviewed: number
  /** Newest in-scope marked attempt by an active member, if any. */
  lastActivityAt: string | null
  headlineGap: string | null
}

export function buildTeacherOverview(
  classes: readonly OverviewClassInput[],
  now: Date = new Date()
): TeacherOverview {
  const week = currentIsoWeek(now)
  const weekStart = week.start.getTime()
  const weekEnd = week.end.getTime()
  const lateEverywhere = new Set<string>()
  let unreviewedTotal = 0
  let silentClasses = 0

  const rows: TeacherOverview['classes'] = classes.map((c) => {
    const archived = c.archived_at !== null
    const members = c.members.filter((m) => m.status === 'active').length
    if (archived) {
      return {
        id: c.id,
        name: c.name,
        subject_code: c.subject_code,
        members,
        open_assignments: 0,
        due_this_week: 0,
        unreviewed: 0,
        late_students: 0,
        headline_gap: null,
        archived: true,
      }
    }

    const open = c.sets.filter((s) => assignmentStatus(s, now) === 'open')
    const dueThisWeek = open.filter((s) => {
      const due = toMs(s.due_at)
      return due !== null && due >= weekStart && due < weekEnd
    }).length
    const late = new Set<string>()
    for (const s of open) for (const id of overdueStudentIds(s, c.members, now)) late.add(id)
    for (const id of late) lateEverywhere.add(id)
    const unreviewed = Math.max(0, c.unreviewed)
    unreviewedTotal += unreviewed
    if (isSilentClass(c.members, c.lastActivityAt, now)) silentClasses += 1

    return {
      id: c.id,
      name: c.name,
      subject_code: c.subject_code,
      members,
      open_assignments: open.length,
      due_this_week: dueThisWeek,
      unreviewed,
      late_students: late.size,
      headline_gap: c.headlineGap,
      archived: false,
    }
  })

  return {
    // Live classes keep the caller's order; archived ones follow.
    classes: [...rows.filter((r) => !r.archived), ...rows.filter((r) => r.archived)],
    needs_you: {
      unreviewed: unreviewedTotal,
      late_students: lateEverywhere.size,
      silent_classes: silentClasses,
    },
  }
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

type ClassroomRow = {
  id: string
  name: string
  subject_code: string | null
  archived_at: string | null
  created_at: string
}

/**
 * The desk for `teacherId`, read with that teacher's own RLS client (the
 * caller has checked requireTeacher). Classes come newest first, archived
 * last.
 */
export async function loadTeacherOverview(
  supabase: SupabaseClient,
  teacherId: string,
  opts: { now?: Date } = {}
): Promise<TeacherOverview> {
  const now = opts.now ?? new Date()
  const { rows: classrooms } = await fetchAllFiltered<ClassroomRow>('classrooms', (from, to) =>
    supabase
      .from('classrooms')
      .select('id, name, subject_code, archived_at, created_at')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, to)
  )
  if (classrooms.length === 0) return buildTeacherOverview([], now)

  const live = classrooms.filter((c) => c.archived_at === null)
  const liveIds = live.map((c) => c.id)
  const [membersByClass, published] = await Promise.all([
    getMembersForClassrooms(
      supabase,
      classrooms.map((c) => c.id)
    ),
    loadPublishedSets(supabase, liveIds),
  ])

  // Hydrate only what the desk reads: open sets and each class's last completed set.
  const nowMs = now.getTime()
  const setsByClass = new Map<string, SetRow[]>()
  for (const s of published) {
    const list = setsByClass.get(s.classroom_id)
    if (list) list.push(s)
    else setsByClass.set(s.classroom_id, [s])
  }
  const wanted = new Map<string, SetRow>()
  const lastByClass = new Map<string, string>()
  for (const [classId, sets] of setsByClass) {
    for (const s of sets) if (assignmentStatus(s, now) === 'open') wanted.set(s.id, s)
    const last = pickLastCompletedSet(sets, nowMs)
    if (last) {
      wanted.set(last.id, last)
      lastByClass.set(classId, last.id)
    }
  }

  const activeStudents = new Set<string>()
  for (const id of liveIds) {
    for (const m of membersByClass.get(id) ?? []) if (m.status === 'active') activeStudents.add(m.student_id)
  }

  const [hydrated, unreviewedCounts, recent] = await Promise.all([
    hydrateSets(supabase, [...wanted.values()]),
    Promise.all(
      liveIds.map((id) =>
        countSubmissions(
          supabase,
          (setsByClass.get(id) ?? []).map((s) => s.id),
          { unreviewed: true }
        )
      )
    ),
    loadAttemptRows(supabase, [...activeStudents], {
      lowerBound: new Date(nowMs - SILENT_AFTER_DAYS * DAY_MS).toISOString(),
      limit: MAX_ATTEMPT_LIMIT,
      withMarking: false,
    }),
  ])
  const hydratedById = new Map(hydrated.map((s) => [s.id, s]))

  // Headline gaps: every class's last completed set's hand-ins, in one read.
  const gapIdsByClass = new Map<string, string[]>()
  for (const [classId, setId] of lastByClass) {
    const set = hydratedById.get(setId)
    if (!set) continue
    const active = new Set(
      (membersByClass.get(classId) ?? []).filter((m) => m.status === 'active').map((m) => m.student_id)
    )
    gapIdsByClass.set(
      classId,
      set.submissions
        .filter((s) => s.attempt_id && active.has(s.student_id))
        .map((s) => s.attempt_id as string)
    )
  }
  const gapAttempts = await loadAttemptsByIds(supabase, [...gapIdsByClass.values()].flat())
  const gapById = new Map(gapAttempts.map((a) => [a.id, a]))

  const unreviewedByClass = new Map(liveIds.map((id, i) => [id, unreviewedCounts[i] ?? 0]))

  const inputs: OverviewClassInput[] = classrooms.map((c) => {
    const members = membersByClass.get(c.id) ?? []
    if (c.archived_at !== null) {
      return {
        id: c.id,
        name: c.name,
        subject_code: c.subject_code,
        archived_at: c.archived_at,
        members,
        sets: [],
        unreviewed: 0,
        lastActivityAt: null,
        headlineGap: null,
      }
    }
    const scoped: ClassroomAttempt[] = scopeClassroomAttempts(recent.attempts, members, {
      subjectCode: c.subject_code,
    })
    const gapRows = scopeClassroomAttempts(
      (gapIdsByClass.get(c.id) ?? [])
        .map((id) => gapById.get(id))
        .filter((a): a is ClassroomAttempt => a !== undefined),
      members,
      { subjectCode: null }
    )
    return {
      id: c.id,
      name: c.name,
      subject_code: c.subject_code,
      archived_at: null,
      members,
      sets: (setsByClass.get(c.id) ?? [])
        .map((s) => hydratedById.get(s.id))
        .filter((s): s is ClassSet => s !== undefined),
      unreviewed: unreviewedByClass.get(c.id) ?? 0,
      // Newest first, so the first scoped attempt is the latest activity.
      lastActivityAt: scoped[0]?.created_at ?? null,
      headlineGap: lastByClass.has(c.id) ? headlineGapText(buildCohortGapReport(gapRows)) : null,
    }
  })

  return buildTeacherOverview(inputs, now)
}

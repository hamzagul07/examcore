import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { displayName } from '@/lib/teacher/display-name'
import { buildErrorGroups } from '@/lib/teacher/groups'
import type { TeacherClassroomRow } from '@/lib/teacher/list-classrooms'
import type { ErrorGroup } from '@/lib/teacher/types'
import { computeStudentQuadrants, type StudentQuadrantMetric } from '@/lib/teacher-analytics'
import { getClassroomAttempts, getStudentProfiles } from '@/lib/teacher-classroom-data'

/**
 * The two panels at the foot of the class week that read the class's marked
 * work rather than its sets: error groups (ErrorGroupsPanel) and the grade
 * risk matrix (GradeRiskMatrix). Both come from ONE scoped read of the
 * class's attempts — active members, since each joined, in the class subject
 * (getClassroomAttempts) — with the same P1 functions the `T/groups` and
 * `T/quadrants` routes use, so the panels here match those routes.
 *
 * The page streams this behind <Suspense>: it is the heaviest read on the
 * page (per-mark detail for every script), and the week above it should not
 * wait for it.
 */

export type ClassInsights = {
  groups: ErrorGroup[]
  /** student id → "Amira K." for the students in `groups`. */
  names: Record<string, string>
  quadrants: StudentQuadrantMetric[]
  /** Older work existed beyond the read limit; the panels say so. */
  truncated: boolean
}

export async function loadClassInsights(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  classroom: Pick<TeacherClassroomRow, 'id' | 'subject_code' | 'board'>
): Promise<ClassInsights> {
  const { attempts, truncated, studentIds } = await getClassroomAttempts(supabase, classroom.id, {
    subjectCode: classroom.subject_code,
    withMarking: true,
    // Only to place past-paper attempts in the subject by their paper code
    // (never the scheme text); ownership was proven by the caller.
    admin,
  })
  const profiles = studentIds.length > 0 ? await getStudentProfiles(supabase, studentIds) : new Map()

  const groups = buildErrorGroups(attempts, classroom.subject_code ?? '')
  const names: Record<string, string> = {}
  for (const g of groups) {
    for (const id of g.student_ids) {
      if (!(id in names)) names[id] = displayName(profiles.get(id)?.full_name ?? null)
    }
  }

  return {
    groups,
    names,
    quadrants: computeStudentQuadrants(attempts, studentIds, classroom.subject_code, classroom.board ?? '', profiles),
    truncated,
  }
}

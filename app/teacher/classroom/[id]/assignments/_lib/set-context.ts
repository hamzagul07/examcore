import 'server-only'

import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { loadAssignment, reconcileAssignment } from '@/lib/teacher/assignments'
import { isUuid } from '@/lib/teacher/list-classrooms'
import type { Assignment, AssignmentItem, AssignmentProgress } from '@/lib/teacher/types'
import { requireClassContext, type ClassContext } from './context'

/**
 * The gate for one set's pages (the set and its print sheet): the class gate,
 * then the set — read through the teacher's RLS client and required to
 * belong to THIS classroom, so a set id pasted under another class's URL is
 * a 404 rather than a set shown under the wrong class. Only after that is
 * the service client created (reconciling plain /mark hand-ins and reading
 * an archived class's retained ones are service-role work).
 */
export const requireSetContext = cache(
  async (classroomId: string, assignmentId: string, nextPath: string): Promise<ClassContext & { admin: SupabaseClient }> => {
    const ctx = await requireClassContext(classroomId, nextPath)
    if (!isUuid(assignmentId)) notFound()
    const { data, error } = await ctx.supabase
      .from('assignments')
      .select('id')
      .eq('id', assignmentId)
      .eq('classroom_id', ctx.classroom.id)
      .maybeSingle()
    if (error) throw new Error(`assignments: ${error.message}`)
    if (!data) notFound()
    return { ...ctx, admin: createServiceClient() }
  }
)

export type SetPageData = ClassContext & {
  admin: SupabaseClient
  assignment: Assignment
  items: AssignmentItem[]
  progress: AssignmentProgress
}

/**
 * The set with its items and progress (the completion matrix), after
 * matching the class's plain /mark work to it — as `GET T/assignments/[aid]`
 * does, at most once a minute per set. A reconcile failure is logged and the
 * set is shown as stored. Cached per request so metadata and page share it.
 */
export const loadSetPage = cache(async (classroomId: string, assignmentId: string): Promise<SetPageData> => {
  const ctx = await requireSetContext(
    classroomId,
    assignmentId,
    `/teacher/classroom/${classroomId}/assignments/${assignmentId}`
  )
  try {
    await reconcileAssignment(ctx.admin, assignmentId)
  } catch (err) {
    console.error('[teacher/set-page] reconcile failed (showing the set as stored)', {
      assignmentId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
  const loaded = await loadAssignment(ctx.supabase, ctx.admin, assignmentId)
  if (!loaded) notFound()
  return { ...ctx, ...loaded }
})

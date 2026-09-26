import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildErrorGroups } from '@/lib/teacher/groups'
import {
  NO_STORE,
  authorizeClassroomRoute,
  internalError,
  loadDisplayNames,
  loadScopedClass,
} from '@/lib/teacher/insights/server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/**
 * GET → `{ groups: ErrorGroup[], names, truncated }` — students losing marks
 * the same way (buildErrorGroups: conceptual errors per syllabus topic,
 * slips across topics), largest group first. `names` maps each grouped
 * student to "Amira K." for the panel. A class with no subject set has no
 * syllabus to group by and returns no groups.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeClassroomRoute(id)
  if ('response' in auth) return auth.response
  const { supabase, classroom } = auth

  try {
    const scoped = await loadScopedClass(supabase, createServiceClient(), classroom, { withMarking: true })
    const groups = classroom.subject_code ? buildErrorGroups(scoped.attempts, classroom.subject_code) : []
    const names = await loadDisplayNames(supabase, [...new Set(groups.flatMap((g) => g.student_ids))])
    return NextResponse.json({ groups, names, truncated: scoped.truncated }, { headers: NO_STORE })
  } catch (err) {
    return internalError('groups', err, 'Could not load the error groups.')
  }
}

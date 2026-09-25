import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { summarizeClassAnalytics } from '@/lib/teacher-analytics'
import { NO_STORE, authorizeClassroomRoute, internalError, loadScopedClass } from '@/lib/teacher/insights/server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/**
 * GET → `{ classroomName, archived, truncated, ...ClassSummary }` — the
 * class's headline figures (students, students with work, marked scripts,
 * marks-weighted average, syllabus coverage, per-topic rows) over its scoped
 * work: active members, marked since joining, in the class subject. The
 * average is null, not 0, when nothing has been marked.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeClassroomRoute(id)
  if ('response' in auth) return auth.response
  const { supabase, classroom } = auth

  try {
    // Service client only now that ownership is proven (spec §3).
    const scoped = await loadScopedClass(supabase, createServiceClient(), classroom, { withMarking: false })
    return NextResponse.json(
      {
        classroomName: classroom.name,
        archived: classroom.archived_at !== null,
        truncated: scoped.truncated,
        ...summarizeClassAnalytics(scoped.attempts, scoped.studentIds, classroom.subject_code),
      },
      { headers: NO_STORE }
    )
  } catch (err) {
    return internalError('analytics', err, 'Could not load the class analytics.')
  }
}

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  NO_STORE,
  authorizeClassroomRoute,
  classBlindspots,
  internalError,
  loadBlindspotSamples,
  loadScopedClass,
} from '@/lib/teacher/insights/server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/** Topics that get sample questions — the ones a teacher acts on first. */
const SAMPLED_TOPICS = 5

/**
 * GET → `{ topics: BlindspotInput[], topicsWithQuestions: Array<BlindspotInput & { sampleQuestions }>, truncated }`.
 *
 * `topics` are the class's weak syllabus topics in its own subject, weakest
 * first, each with how many of the roster it rests on. The first few carry
 * banked questions from the same subject (by paper code) as `sampleQuestions`
 * — a ≤160-character preview of the question, never the mark scheme.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const auth = await authorizeClassroomRoute(id)
  if ('response' in auth) return auth.response
  const { supabase, classroom } = auth

  try {
    const admin = createServiceClient()
    const scoped = await loadScopedClass(supabase, admin, classroom, { withMarking: false })
    const topics = classBlindspots(scoped, classroom.subject_code)
    const head = topics.slice(0, SAMPLED_TOPICS)
    const samples = await loadBlindspotSamples(
      admin,
      classroom.subject_code,
      head.map((t) => t.code)
    )
    return NextResponse.json(
      {
        topics,
        topicsWithQuestions: head.map((t) => ({ ...t, sampleQuestions: samples[t.code] ?? [] })),
        truncated: scoped.truncated,
      },
      { headers: NO_STORE }
    )
  } catch (err) {
    return internalError('blindspots', err, 'Could not load the class blindspots.')
  }
}

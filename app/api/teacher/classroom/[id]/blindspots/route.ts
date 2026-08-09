import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireClassroomTeacher } from '@/lib/teacher/route-guard'
import {
  computeBlindspots,
  computeTopicAnalytics,
} from '@/lib/teacher-analytics'
import { getClassroomAttempts } from '@/lib/teacher-classroom-data'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const guard = await requireClassroomTeacher(id)
  if (!guard.ok) return guard.response
  const { supabase } = guard.ctx

  const { studentIds, attempts } = await getClassroomAttempts(supabase, id)
  const topicAnalytics = computeTopicAnalytics(attempts)
  const blindspots = computeBlindspots(topicAnalytics, studentIds.length)

  const admin = createAdminClient()
  const topicsWithQuestions = await Promise.all(
    blindspots.slice(0, 5).map(async (bs) => {
      const { data: questions } = await admin
        .from('mark_schemes')
        .select('id, question_text, total_marks, paper_code, paper_session, question_number')
        .contains('syllabus_tags', [bs.code])
        .gte('total_marks', 2)
        .lte('total_marks', 6)
        .limit(5)

      return {
        ...bs,
        sampleQuestions: questions || [],
      }
    })
  )

  return NextResponse.json({
    topics: blindspots,
    topicsWithQuestions,
  })
}

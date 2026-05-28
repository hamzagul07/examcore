import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  requireTeacher,
  verifyTeacherOwnsClassroom,
} from '@/lib/teacher-auth'
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) {
    return NextResponse.json({ error: 'Not a teacher' }, { status: 403 })
  }

  const owns = await verifyTeacherOwnsClassroom(supabase, user.id, id)
  if (!owns) {
    return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
  }

  const { studentIds, attempts } = await getClassroomAttempts(supabase, id)
  const topicAnalytics = computeTopicAnalytics(attempts, studentIds.length)
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

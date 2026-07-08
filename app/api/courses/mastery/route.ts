import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { calculateMastery, type MasteryLevel } from '@/lib/mastery'
import { filterAttemptsBySubject, type AttemptWithPaper } from '@/lib/syllabi/attempts'
import { topicToLessonSlug } from '@/lib/courses/slug'
import { getCourseLesson } from '@/lib/courses'
import { isIbSubjectCode } from '@/lib/ib/marking-config'

export type MasteryTopic = {
  code: string
  name: string
  level: MasteryLevel
  percentage: number
  attemptsCount: number
  href: string | null
}

/**
 * Per-topic mastery for the signed-in user on one subject, derived from their
 * marked attempts. Powers the lesson-page mastery band + "study next"
 * recommendation. Only topics the user has actually attempted are returned;
 * each carries the verified lesson href (Cambridge; IB href deferred).
 */
export async function GET(request: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) {
    return jsonWithAuthCookies({ topics: [] }, pendingCookies, { status: 401 })
  }

  const subject = new URL(request.url).searchParams.get('subject')?.trim()
  if (!subject) {
    return jsonWithAuthCookies({ topics: [] }, pendingCookies)
  }

  const { data, error } = await supabase
    .from('attempts')
    .select(
      `
      id, marks_earned, total_marks, syllabus_tags, created_at,
      time_spent_seconds, question_text, source_type, error_classifications,
      mark_schemes ( question_number, paper_code, paper_session )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[courses/mastery] read failed:', error)
    return jsonWithAuthCookies({ topics: [] }, pendingCookies, { status: 500 })
  }

  const attempts = filterAttemptsBySubject((data ?? []) as AttemptWithPaper[], subject)
  const isIb = isIbSubjectCode(subject)

  const topics: MasteryTopic[] = calculateMastery(attempts, subject)
    .filter((m) => m.attemptsCount > 0)
    .map((m) => {
      let href: string | null = null
      if (!isIb) {
        const slug = topicToLessonSlug(m.code, m.name)
        if (getCourseLesson(subject, slug)) href = `/courses/${subject}/${slug}`
      }
      return {
        code: m.code,
        name: m.name,
        level: m.level,
        percentage: Math.round(m.percentage),
        attemptsCount: m.attemptsCount,
        href,
      }
    })

  return jsonWithAuthCookies({ topics }, pendingCookies)
}

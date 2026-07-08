import { NextRequest, NextResponse } from 'next/server'
import { getSyllabusTopicByCode } from '@/lib/syllabi'
import { topicToLessonSlug } from '@/lib/courses/slug'
import { getCourseLesson } from '@/lib/courses'
import { isIbSubjectCode } from '@/lib/ib/marking-config'

export type MarkBackLesson = { code: string; name: string; href: string }

/**
 * Resolves marking `syllabus_tags` to the course lessons that fix each weak
 * area — "mark-back". Only returns lessons that actually exist (verified via
 * getCourseLesson), so the client never renders a link that 404s.
 *
 * IB resolution is deferred; IB subjects return an empty list rather than
 * guessing (no broken links).
 */
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const subject = params.get('subject')?.trim()
  const codesRaw = params.get('codes')?.trim()

  if (!subject || !codesRaw) {
    return NextResponse.json({ lessons: [] })
  }
  if (isIbSubjectCode(subject)) {
    return NextResponse.json({ lessons: [] })
  }

  const codes = [
    ...new Set(
      codesRaw
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    ),
  ].slice(0, 12)

  const lessons: MarkBackLesson[] = []
  const seen = new Set<string>()

  for (const code of codes) {
    const topic = getSyllabusTopicByCode(subject, code)
    if (!topic) continue
    const slug = topicToLessonSlug(topic.code, topic.name)
    if (seen.has(slug)) continue
    const lesson = getCourseLesson(subject, slug)
    if (!lesson) continue
    seen.add(slug)
    lessons.push({
      code: topic.code,
      name: lesson.title || topic.name,
      href: `/courses/${subject}/${slug}`,
    })
  }

  return NextResponse.json({ lessons })
}

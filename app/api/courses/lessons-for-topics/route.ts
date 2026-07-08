import { NextRequest, NextResponse } from 'next/server'
import { makeTopicLessonResolver } from '@/lib/courses/topic-lesson'

export type MarkBackLesson = { code: string; name: string; href: string }

/**
 * Resolves marking `syllabus_tags` to the course lessons that fix each weak
 * area — "mark-back". Only returns lessons that actually exist, so the client
 * never renders a link that 404s. Works for both Cambridge and IB.
 */
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const subject = params.get('subject')?.trim()
  const codesRaw = params.get('codes')?.trim()

  if (!subject || !codesRaw) {
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

  const resolve = makeTopicLessonResolver(subject)
  const lessons: MarkBackLesson[] = []
  const seen = new Set<string>()

  for (const code of codes) {
    const resolved = resolve(code)
    if (!resolved || seen.has(resolved.href)) continue
    seen.add(resolved.href)
    lessons.push(resolved)
  }

  return NextResponse.json({ lessons })
}

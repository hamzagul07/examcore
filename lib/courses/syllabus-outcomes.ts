import type { LessonSubtopic } from '@/lib/courses/types'
import o9700 from '@/lib/courses/syllabus-objectives/9700.json'
import o9702 from '@/lib/courses/syllabus-objectives/9702.json'
import o9706 from '@/lib/courses/syllabus-objectives/9706.json'

/**
 * Server-only: derives a lesson's syllabus sub-topics from the extracted
 * Cambridge learning outcomes. Lessons in these subjects sit at a 2-level topic
 * code (e.g. "4.2"); the outcomes are the 3-level points beneath it (4.2.1, …),
 * which become the "What this topic covers" list. Keep this out of client
 * bundles — only the server lesson route should import it.
 */
type Outcome = { code: string; topic: string; text: string }

const BY_SUBJECT: Record<string, Outcome[]> = {
  '9700': o9700 as Outcome[],
  '9702': o9702 as Outcome[],
  '9706': o9706 as Outcome[],
}

function sentenceCase(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
}

export function getSubtopicsForLesson(
  subjectCode: string,
  topicCode: string
): LessonSubtopic[] {
  const outcomes = BY_SUBJECT[subjectCode]
  if (!outcomes || !topicCode) return []
  const prefix = `${topicCode}.`
  return outcomes
    .filter((o) => typeof o.code === 'string' && o.code.startsWith(prefix))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    .map((o) => ({ code: o.code, title: sentenceCase(o.text) }))
}

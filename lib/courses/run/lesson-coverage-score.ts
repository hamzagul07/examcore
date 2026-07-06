import type { CourseLesson } from '@/lib/courses/types'
import { SYLLABUS_OUTCOMES } from '@/lib/courses/syllabus-objectives'

function collectLessonText(lesson: CourseLesson): string {
  const parts: string[] = [lesson.summary, lesson.title]
  for (const s of lesson.sections) {
    if ('content' in s) parts.push(s.content)
    if (s.type === 'keyPoints') parts.push(...s.items)
    if (s.type === 'workedExample') {
      parts.push(s.question, s.solution)
    }
  }
  if (lesson.learningObjectives) parts.push(...lesson.learningObjectives)
  return parts.join('\n').toLowerCase()
}

/** Estimate syllabus objective coverage for on-disk lessons (no Supabase). */
export function estimateLessonCoverageScore(
  lesson: CourseLesson,
  subjectCode: string,
  topicCode: string
): { score: number; objectiveCount: number } {
  const outcomes = (SYLLABUS_OUTCOMES[subjectCode] ?? []).filter(
    (o) => o.topic === topicCode
  )
  if (!outcomes.length) {
    return { score: 1, objectiveCount: 0 }
  }

  const expected = new Set(outcomes.map((o) => o.code))
  const covered = new Set(lesson.syllabusObjectivesCovered ?? [])
  const text = collectLessonText(lesson)

  let keywordHits = 0
  for (const obj of outcomes) {
    const tokens = obj.text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 4)
      .slice(0, 4)
    if (tokens.some((t) => text.includes(t))) keywordHits += 1
  }

  const listScore = expected.size === 0 ? 0 : covered.size / expected.size
  const keywordScore = keywordHits / outcomes.length
  const score = Math.min(1, listScore * 0.5 + keywordScore * 0.5)

  return { score, objectiveCount: outcomes.length }
}

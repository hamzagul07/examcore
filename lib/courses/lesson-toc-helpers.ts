import type { CourseLesson } from '@/lib/courses/types'

export function headingToId(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `section-${base || index}`
}

export function extractKeyTakeaways(lesson: CourseLesson): string[] {
  const keyPoints = lesson.sections.find((s) => s.type === 'keyPoints')
  if (keyPoints?.type === 'keyPoints' && keyPoints.items.length) {
    return keyPoints.items
  }
  return lesson.learningObjectives ?? []
}

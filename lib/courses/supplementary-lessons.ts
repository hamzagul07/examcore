import fs from 'fs'
import path from 'path'
import type { CourseLesson } from '@/lib/courses/types'

const COURSES_DIR = path.join(process.cwd(), 'content', 'courses')

/** Extra lessons outside the syllabus tree (e.g. Paper 5 skills module). */
const SUPPLEMENTARY_BY_SUBJECT: Record<string, string[]> = {
  '9702': ['paper-5-planning-and-analysis.json'],
}

export function loadSupplementaryLessons(subjectCode: string): CourseLesson[] {
  const files = SUPPLEMENTARY_BY_SUBJECT[subjectCode]
  if (!files?.length) return []

  const dir = path.join(COURSES_DIR, subjectCode)
  const lessons: CourseLesson[] = []

  for (const file of files) {
    const fp = path.join(dir, file)
    if (!fs.existsSync(fp)) continue
    try {
      const raw = JSON.parse(fs.readFileSync(fp, 'utf8')) as CourseLesson
      if (!raw.slug || !raw.topicCode) continue
      lessons.push(raw)
    } catch {
      /* skip invalid */
    }
  }

  return lessons
}

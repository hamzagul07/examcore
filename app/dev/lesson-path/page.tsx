import { getCourseLesson } from '@/lib/courses'
import { enrichLessonVisual } from '@/lib/courses/enrich-lesson-visual'
import { LessonPathDemo } from './demo'

export const metadata = {
  title: 'Lesson as a path — dev',
  robots: { index: false, follow: false },
}

const CODE = 'ib-biology-hl'
const SLUG = 'a2-2-cell-structure'

export default function LessonPathDevPage() {
  const lesson = getCourseLesson(CODE, SLUG)
  if (!lesson) return <main style={{ padding: 40 }}>Lesson not found.</main>
  const enriched = enrichLessonVisual(CODE, lesson)
  return <LessonPathDemo subjectCode={CODE} lesson={lesson} enriched={enriched} />
}

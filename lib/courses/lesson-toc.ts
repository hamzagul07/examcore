import type { CourseLesson } from '@/lib/courses/types'
import type { TocEntry } from '@/components/courses/CourseLessonToc'
import type { PartitionedVisualBlocks } from '@/lib/courses/lesson-layout'
import { extractWorkedExamples, hasRenderableNotes } from '@/lib/courses/lesson-layout'
import type { EnrichedVisualLesson } from '@/lib/courses/visual-types'
import { extractKeyTakeaways } from '@/lib/courses/lesson-toc-helpers'

export { headingToId, extractKeyTakeaways } from '@/lib/courses/lesson-toc-helpers'

export function buildLessonToc(
  lesson: CourseLesson,
  enriched: EnrichedVisualLesson,
  partitioned: PartitionedVisualBlocks
): TocEntry[] {
  const entries: TocEntry[] = []
  const workedExamples = extractWorkedExamples(lesson)
  const takeaways = extractKeyTakeaways(lesson)
  const hasNotes = hasRenderableNotes(lesson, enriched)
  const hasVisual =
    partitioned.heroVisual !== null ||
    partitioned.stepCarousel !== null ||
    partitioned.diagramImage !== null || partitioned.diagramImages.length > 0

  if (lesson.simpleExplanation) {
    entries.push({ id: 'simple-explanation', label: 'Simple explanation', level: 2 })
  }

  if (hasVisual) {
    entries.push({ id: 'visual-learning', label: 'Visual learning', level: 2 })
  }

  if (partitioned.formulaVisuals.length) {
    entries.push({ id: 'key-formulas', label: 'Key formulas', level: 2 })
  }

  if (hasNotes) {
    entries.push({ id: 'full-notes', label: 'Full notes', level: 2 })
  }

  if (workedExamples.length) {
    entries.push({ id: 'worked-examples', label: 'Worked examples', level: 2 })
  }

  const pastPaperPractice = lesson.sections.find((s) => s.type === 'pastPaperPractice')
  if (pastPaperPractice?.type === 'pastPaperPractice' && pastPaperPractice.questions.length) {
    entries.push({ id: 'past-paper-practice', label: 'Past paper practice', level: 2 })
  }

  if (partitioned.comparisonTable) {
    entries.push({ id: 'comparison', label: 'Comparison', level: 2 })
  }

  if (partitioned.conceptMap) {
    entries.push({ id: 'concept-map', label: 'Concept map', level: 2 })
  }

  if (partitioned.keyTerms) {
    entries.push({ id: 'glossary', label: 'Glossary', level: 2 })
  }

  if (partitioned.quickCheck) {
    entries.push({ id: 'quick-check', label: 'Quick check', level: 2 })
  }

  if (partitioned.flashcards) {
    entries.push({ id: 'flashcards', label: 'Flashcards', level: 2 })
  }

  if (takeaways.length) {
    entries.push({ id: 'key-takeaways', label: 'Key takeaways', level: 2 })
  }

  const hasPractice = lesson.sections.some((s) => s.type === 'practice')
  if (hasPractice) {
    entries.push({ id: 'practice', label: 'Practice', level: 2 })
  }

  return entries
}

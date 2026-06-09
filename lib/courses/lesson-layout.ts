import type { CourseLesson, LessonSection, WorkedExampleDiagram } from '@/lib/courses/types'
import type { EnrichedVisualLesson, VisualBlock } from '@/lib/courses/visual-types'

export type PartitionedVisualBlocks = {
  heroVisual: Extract<VisualBlock, { type: 'hero-visual' }> | null
  stepCarousel: Extract<VisualBlock, { type: 'step-carousel' }> | null
  formulaVisuals: Extract<VisualBlock, { type: 'formula-visual' }>[]
  comparisonTable: Extract<VisualBlock, { type: 'comparison-table' }> | null
  conceptMap: Extract<VisualBlock, { type: 'concept-map' }> | null
  keyTerms: Extract<VisualBlock, { type: 'key-terms' }> | null
  quickCheck: Extract<VisualBlock, { type: 'quick-check' }> | null
  flashcards: Extract<VisualBlock, { type: 'flashcards' }> | null
  diagramImage: Extract<VisualBlock, { type: 'diagram-image' }> | null
  diagramImages: Extract<VisualBlock, { type: 'diagram-image' }>[]
}

export type WorkedExampleItem = {
  id: string
  question: string
  solution: string
  sourceQuestionId?: string
  diagrams?: WorkedExampleDiagram[]
}

export function partitionEnrichedBlocks(blocks: VisualBlock[]): PartitionedVisualBlocks {
  const result: PartitionedVisualBlocks = {
    heroVisual: null,
    stepCarousel: null,
    formulaVisuals: [],
    comparisonTable: null,
    conceptMap: null,
    keyTerms: null,
    quickCheck: null,
    flashcards: null,
    diagramImage: null,
    diagramImages: [],
  }

  for (const block of blocks) {
    switch (block.type) {
      case 'hero-visual':
        result.heroVisual = block
        break
      case 'step-carousel':
        result.stepCarousel = block
        break
      case 'formula-visual':
        result.formulaVisuals.push(block)
        break
      case 'comparison-table':
        result.comparisonTable = block
        break
      case 'concept-map':
        result.conceptMap = block
        break
      case 'key-terms':
        result.keyTerms = block
        break
      case 'quick-check':
        result.quickCheck = block
        break
      case 'flashcards':
        result.flashcards = block
        break
      case 'diagram-image':
        result.diagramImages.push(block)
        result.diagramImage = block
        break
      default:
        break
    }
  }

  return result
}

export function extractWorkedExamples(lesson: CourseLesson): WorkedExampleItem[] {
  const examples: WorkedExampleItem[] = []
  let index = 0

  for (const section of lesson.sections) {
    if (section.type !== 'workedExample') continue
    index += 1
    examples.push({
      id: `worked-example-${index}`,
      question: section.question,
      solution: section.solution,
      sourceQuestionId: section.sourceQuestionId,
      diagrams: section.diagrams,
    })
  }

  return examples
}

/** Preserve enrich-lesson-visual dedup: omit sections already rendered as visual blocks. */
export function buildNotesLesson(
  lesson: CourseLesson,
  enriched: EnrichedVisualLesson,
  options?: { omitWorkedExamples?: boolean }
): CourseLesson {
  const visualTypes = new Set(enriched.blocks.map((b) => b.type))
  const omitWorked = options?.omitWorkedExamples ?? true

  return {
    ...lesson,
    sections: lesson.sections
      .filter((s) => {
        if (omitWorked && s.type === 'workedExample') return false
        if (s.type === 'workedExample' && visualTypes.has('worked-visual')) return false
        if (s.type === 'formula' && visualTypes.has('formula-visual')) return false
        if (s.type === 'examTip' && visualTypes.has('exam-tip')) return false
        if (s.type === 'practice') return false
        if (s.type === 'pastPaperPractice') return false
        if (s.type === 'keyPoints') return false
        return true
      })
      .map((s) => rewriteSectionWorkedExampleRefs(s, omitWorked && extractWorkedExamples(lesson).length > 0)),
  }
}

const WORKED_EXAMPLE_REF =
  /\b(see\s+(?:the\s+)?worked\s+example\s*(\d+)?\s*(?:below|↓)|worked\s+example\s*(\d+)?\s*(?:below|↓)|in\s+the\s+worked\s+example\s*(\d+)?\s*(?:below|↓)|apply\s+this\s+with\s+worked\s+example\s*(\d+)?\s*(?:below|↓))/gi

export function rewriteWorkedExampleRefs(content: string, hasWorkedExamples: boolean): string {
  if (!hasWorkedExamples) return content

  return content.replace(WORKED_EXAMPLE_REF, (match, n1, n2, n3, n4) => {
    const num = n1 || n2 || n3 || n4
    const anchor = num ? `#worked-example-${num}` : '#worked-examples'
    const label = match.trim().replace(/\s*↓\s*$/, '')
    return `[${label} ↓](${anchor})`
  })
}

function rewriteSectionWorkedExampleRefs(
  section: LessonSection,
  hasWorkedExamples: boolean
): LessonSection {
  if (!hasWorkedExamples) return section
  if (section.type !== 'intro' && section.type !== 'text' && section.type !== 'examTip') {
    return section
  }
  return {
    ...section,
    content: rewriteWorkedExampleRefs(section.content, true),
  }
}

export function hasRenderableNotes(lesson: CourseLesson, enriched: EnrichedVisualLesson): boolean {
  return buildNotesLesson(lesson, enriched).sections.some(
    (s) =>
      s.type === 'intro' ||
      s.type === 'heading' ||
      s.type === 'text' ||
      s.type === 'formula' ||
      s.type === 'examTip' ||
      s.type === 'resources'
  )
}

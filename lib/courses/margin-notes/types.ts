export type SubjectFamily = 'Sciences' | 'Maths' | 'Commerce' | 'Humanities'

export type AccentToken =
  | 'acc-blue'
  | 'acc-violet'
  | 'acc-teal'
  | 'acc-rose'
  | 'acc-slate'
  | 'ink'
  | 'amber'
  | 'red'

export type MarginNotesSubject = {
  code: string
  name: string
  glyph: string
  acc: AccentToken
  level: string
  fam: SubjectFamily
  units: number
  lessons: number
  q: number
  prog: number
}

export type MarginNotesTopic = {
  n: string
  t: string
  slug: string
  done?: boolean
  active?: boolean
}

export type MarginNotesUnit = {
  unit: string
  items: MarginNotesTopic[]
}

export type MarginNotesPaper = {
  id: number
  number: string
  name: string
  topics: number
}

export type MarginNotesCourse = {
  blurb: string
  papers: MarginNotesPaper[]
  spines: Record<number, MarginNotesUnit[]>
  units?: MarginNotesUnit[]
}

export type LessonStep = { n: number; title: string; body: string }

export type LessonFormula = {
  /** Plain-text fallback for tap-to-define token UI */
  tex: string
  /** KaTeX/markdown when the equation is LaTeX-heavy */
  latex?: string
  parts: { s: string; m: string }[]
}

export type LessonNote = { h: string; p: string; bullets?: string[]; tip?: string }

export type LessonWorked = { title: string; q: string; steps: string[] }

export type LessonGlossary = { t: string; d: string }

export type LessonQuiz = { q: string; a: string }

export type LessonFlashcard = { q: string; a: string }

export type LessonFaq = { q: string; a: string }

export type LessonPractice = {
  ref: string
  marks: number
  text: string
  href: string
  markPoints?: { text: string; marks: number }[]
}

export type ConceptMapNode = { id: string; t: string; d: string }

export type LessonComparisonTable = {
  title: string
  caption?: string
  columns: string[]
  rows: { property: string; cells: string[] }[]
}

export type MarginNotesLesson = {
  code: string
  sub: string
  point: string
  name: string
  slug: string
  heroPre?: string
  heroEm?: string
  papers: string
  tag: string
  mins: number
  intro: string
  objectives?: string[]
  simple?: {
    title?: string
    lead: string
    analogy: string
    steps?: string[]
    simplerByHeading?: Record<string, string>
  }
  diagram?: 'live'
  steps?: LessonStep[]
  formulas?: LessonFormula[]
  comparisonTable?: LessonComparisonTable
  notes?: LessonNote[]
  worked?: LessonWorked[]
  conceptMap?: { center: string; nodes: ConceptMapNode[] }
  glossary?: LessonGlossary[]
  quiz?: LessonQuiz[]
  flashcards?: LessonFlashcard[]
  takeaways?: string[]
  faqs?: LessonFaq[]
  practice?: LessonPractice
  practiceQuestions?: LessonPractice[]
  prev?: MarginNotesTopic
  next?: MarginNotesTopic
  related?: MarginNotesTopic[]
  outline?: boolean
  hasVisual: boolean
  lessonSlug: string
  template: import('@/lib/courses/visual-types').VisualTemplate
  diagramSpec?: import('@/lib/courses/diagram-specs').LessonDiagramSpec | null
  interactiveEmbed?: import('@/lib/courses/types').LessonInteractiveEmbed | null
  resources?: { label: string; href: string }[]
}

export type ContinueLearning = {
  code: string
  name: string
  acc: AccentToken
  topicCode: string
  topicTitle: string
  unitLabel: string
  href: string
  prog: number
}

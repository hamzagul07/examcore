export type LessonStatus = 'published' | 'outline' | 'premium' | 'pilot'

export type PaperKind = 'mcq' | 'practical' | 'structured'

export type WorkedExampleDiagram = {
  id: string
  src: string
  alt: string
  order: number
}

export type PastPaperPracticeQuestion = {
  questionId: string
  year: number
  session: string
  paperVariant: string
  questionNumber: string
  marks: number
  questionTextPreview: string
  markPoints: Array<{ text: string; marks: number }>
  markHref: string
}

export type LessonSection =
  | { type: 'intro'; content: string }
  | { type: 'heading'; content: string }
  | { type: 'text'; content: string }
  | { type: 'formula'; content: string }
  | { type: 'keyPoints'; items: string[] }
  | { type: 'examTip'; content: string }
  | {
      type: 'workedExample'
      question: string
      solution: string
      /** UUID from extracted_questions — traceability for generated lessons */
      sourceQuestionId?: string
      /** Figures from extracted_diagrams for sourceQuestionId */
      diagrams?: WorkedExampleDiagram[]
    }
  | { type: 'pastPaperPractice'; questions: PastPaperPracticeQuestion[] }
  | { type: 'practice'; label: string; href: string }
  | { type: 'resources'; items: { label: string; href: string }[] }
  | { type: 'interactive'; embed: LessonInteractiveEmbed }

export type CourseQuickCheckItem = {
  prompt: string
  answer: string
  /** MCQ distractors — Paper 1 lessons only */
  options?: string[]
}

export type SimpleExplanation = {
  title: string
  summary: string
  analogy?: string
  steps: string[]
}

export type PastPaperQuestionRef = {
  paperCode: string
  paperSession: string
  sessionLabel: string
  questionNumber: string
  questionText: string
  totalMarks: number
  markHref: string
}

export type CourseFaqItem = {
  q: string
  a: string
}

export type CourseFlashcard = {
  front: string
  back: string
  /** Short glossary pill label (max ~3 words) */
  pillLabel?: string
}

export type ComparisonTableData = {
  caption?: string
  columns: string[]
  rows: { property: string; cells: string[] }[]
}

/** External interactive sim (PhET, GeoGebra, etc.) — one primary visual per topic. */
export type LessonInteractiveEmbed = {
  provider: 'phet' | 'geogebra' | 'custom'
  title: string
  embedUrl: string
  /** Short instruction shown above the iframe */
  hint?: string
  /** Open in new tab when iframe embed fails or for full-screen PhET/GeoGebra UI */
  launchUrl?: string
  /** CSS aspect-ratio value, e.g. "834 / 504" */
  aspectRatio?: string
  attribution: {
    source: string
    license: string
    sourceUrl?: string
  }
}

/** An official syllabus sub-topic / learning outcome this lesson covers. */
export type LessonSubtopic = {
  /** Cambridge syllabus reference, e.g. "1.1.1" (optional where codes don't apply). */
  code?: string
  /** The sub-topic / learning-outcome statement. */
  title: string
  /** Optional one-line elaboration. */
  detail?: string
}

/**
 * A practice question with a worked, mark-by-mark scheme — the "Practice" step
 * of the Study Loop. Each item can be sent to the marking engine so a student's
 * own answer is graded against the scheme. Original, authored content.
 */
export type CourseQuestionBankItem = {
  /** Stable id (slug-scoped), e.g. "sl-4-8-q1". */
  id: string
  /** Question as shown to the student. Supports KaTeX ($…$, $$…$$). */
  prompt: string
  /** Total marks available. */
  marks: number
  /** IB command term, e.g. "Calculate", "Show that", "Hence find". */
  commandTerm?: string
  /** Difficulty tier for progressive practice. */
  difficulty?: 'foundation' | 'standard' | 'challenge'
  /** Official IB syllabus sub-topic drilled, e.g. "SL 4.8". */
  syllabusRef?: string
  /** Paper style this question models, e.g. "P1" (no calc) or "P2" (calc). */
  paper?: string
  /** Whether a calculator is permitted (IB P1 = false, P2 = true). */
  calculator?: boolean
  /**
   * Mark-by-mark scheme (points model) — mirrors the shape used by
   * pastPaperPractice.markPoints so it feeds the existing marker directly.
   */
  markScheme: Array<{ text: string; marks: number }>
  /** Full worked model answer, revealed after an attempt. Supports KaTeX. */
  modelAnswer: string
}

export type CourseLesson = {
  slug: string
  topicCode: string
  title: string
  paper: string
  paperName: string
  status: LessonStatus
  summary: string
  durationMin: number
  sections: LessonSection[]
  learningObjectives?: string[]
  /** Official syllabus sub-topics this lesson covers (rendered as a coverage section). */
  subtopics?: LessonSubtopic[]
  simpleExplanation?: SimpleExplanation
  faq?: CourseFaqItem[]
  diagram?: { src: string; alt: string }
  /** Multi-page reference sheets (e.g. A-Level Notes PDF pages) */
  referenceDiagrams?: { src: string; alt: string; order?: number }[]
  /** Revision flashcards — shown as flip cards in the visual lesson tab */
  flashcards?: CourseFlashcard[]
  /** Side-by-side comparison for contrast topics (e.g. transverse vs longitudinal) */
  comparisonTable?: ComparisonTableData
  /** Prompt seed for Gemini diagram generation (not shown to students) */
  diagramPrompt?: string
  /** Primary interactive sim for this topic (overrides catalog lookup by slug) */
  interactiveEmbed?: LessonInteractiveEmbed
  /** Step-synced diagram layers, params, and embed hints (overrides catalog by slug) */
  diagramSpec?: import('@/lib/courses/diagram-specs').LessonDiagramSpec
  updated?: string
  /** Paper-scoped generation metadata (Prompt B v3) */
  paperNumber?: string
  paperType?: PaperKind
  level?: string
  syllabusObjectivesCovered?: string[]
  pastPaperReferences?: PastPaperQuestionRef[]
  generatedAt?: string
  generatorVersion?: string
  /** Optional MCQ-style quick checks (Paper 1); consumed by enrich-lesson-visual */
  quickCheck?: CourseQuickCheckItem[]
  /**
   * Integrated practice question bank (Study Loop "Practice" step). Rendered as
   * its own tab; each item can be marked against its scheme by the marking engine.
   */
  questionBank?: CourseQuestionBankItem[]
}

export type CourseSubject = {
  code: string
  name: string
  level: string
  lessonCount: number
  publishedCount: number
  path: string
}

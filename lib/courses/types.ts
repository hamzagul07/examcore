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
  simpleExplanation?: SimpleExplanation
  faq?: CourseFaqItem[]
  diagram?: { src: string; alt: string }
  /** Revision flashcards — shown as flip cards in the visual lesson tab */
  flashcards?: CourseFlashcard[]
  /** Side-by-side comparison for contrast topics (e.g. transverse vs longitudinal) */
  comparisonTable?: ComparisonTableData
  /** Prompt seed for Gemini diagram generation (not shown to students) */
  diagramPrompt?: string
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
}

export type CourseSubject = {
  code: string
  name: string
  level: string
  lessonCount: number
  publishedCount: number
  path: string
}

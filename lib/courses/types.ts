export type LessonStatus = 'published' | 'outline' | 'premium'

export type LessonSection =
  | { type: 'intro'; content: string }
  | { type: 'heading'; content: string }
  | { type: 'text'; content: string }
  | { type: 'formula'; content: string }
  | { type: 'keyPoints'; items: string[] }
  | { type: 'examTip'; content: string }
  | { type: 'workedExample'; question: string; solution: string }
  | { type: 'practice'; label: string; href: string }
  | { type: 'resources'; items: { label: string; href: string }[] }

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
  updated?: string
}

export type CourseSubject = {
  code: string
  name: string
  level: string
  lessonCount: number
  publishedCount: number
  path: string
}

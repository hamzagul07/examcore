import { sessionCodeFromYearSeason } from '@/lib/marking/session'
import { buildMarkHref } from '@/lib/courses/format-session'
import {
  ensureFullQuickCheckPrompt,
  glossaryLabelFromFlashcard,
} from '@/lib/courses/glossary-label'
import type { LessonEvidence } from '@/lib/courses/content-source.schema'
import type {
  CourseFlashcard,
  CourseLesson,
  LessonSection,
  PastPaperPracticeQuestion,
  WorkedExampleDiagram,
} from '@/lib/courses/types'
import { stripImgTags } from '@/lib/courses/worked-example-text'
import { attachCatalogVisuals } from '@/lib/courses/attach-lesson-visuals'
import type { GeneratedLesson } from './lesson-schema'

type PastPaperPracticeSection = Extract<
  GeneratedLesson['sections'][number],
  { type: 'pastPaperPractice' }
>

function pickDiverseQuestions<T extends { year: number; session: string }>(
  items: T[],
  max: number
): T[] {
  const sorted = [...items].sort((a, b) => b.year - a.year || a.session.localeCompare(b.session))
  const picked: T[] = []
  const sessions = new Set<string>()

  for (const item of sorted) {
    if (picked.length >= max) break
    const key = `${item.year}-${item.session}`
    if (sessions.has(key) && picked.length < max - 1) continue
    sessions.add(key)
    picked.push(item)
  }

  for (const item of sorted) {
    if (picked.length >= max) break
    if (!picked.includes(item)) picked.push(item)
  }

  return picked.slice(0, max)
}

function previewText(text: string, maxLines = 3): string {
  const stripped = stripImgTags(text)
  const lines = stripped.split('\n').map((l) => l.trim()).filter(Boolean)
  const preview = lines.slice(0, maxLines).join('\n')
  if (lines.length > maxLines) return `${preview}\n…`
  return preview
}

export function buildPastPaperPracticeSection(
  evidence: LessonEvidence,
  subjectCode: string,
  max = 8
): PastPaperPracticeSection | null {
  if (!evidence.questions.length) return null

  const marksByQuestion = new Map<string, { text: string; marks: number }[]>()
  for (const m of evidence.markSchemes) {
    const list = marksByQuestion.get(m.question_id) ?? []
    list.push({ text: m.point_text, marks: m.marks_awarded })
    marksByQuestion.set(m.question_id, list)
  }

  const picked = pickDiverseQuestions(evidence.questions, max)
  const questions: PastPaperPracticeQuestion[] = picked.map((q) => ({
    questionId: q.id,
    year: q.year,
    session: q.session,
    paperVariant: q.variant,
    questionNumber: q.question_number,
    marks: q.marks ?? 1,
    questionTextPreview: previewText(q.question_text),
    markPoints: marksByQuestion.get(q.id) ?? [],
    markHref: buildMarkHref(
      subjectCode,
      `${q.subject_code}/${q.variant}`,
      sessionCodeFromYearSeason(q.year, q.session) ?? `${q.session} ${q.year}`,
      q.question_number
    ),
  }))

  return { type: 'pastPaperPractice', questions }
}

export function attachDiagramsToWorkedExamples(
  lesson: GeneratedLesson,
  diagramsByQuestion: Map<string, WorkedExampleDiagram[]>
): GeneratedLesson {
  const sections = lesson.sections.map((s) => {
    if (s.type !== 'workedExample') return s
    const diagrams = s.sourceQuestionId
      ? diagramsByQuestion.get(s.sourceQuestionId) ?? []
      : []
    return {
      ...s,
      question: stripImgTags(s.question),
      diagrams: diagrams.length ? diagrams : undefined,
    }
  })
  return { ...lesson, sections }
}

export function removeOrphanHeadings(sections: LessonSection[]): LessonSection[] {
  const contentTypes = new Set(['intro', 'text', 'formula', 'keyPoints', 'examTip', 'workedExample'])

  return sections.filter((s, i) => {
    if (s.type !== 'heading') return true
    for (let j = i + 1; j < sections.length; j++) {
      const next = sections[j]
      if (next.type === 'heading') return false
      if (contentTypes.has(next.type)) return true
    }
    return false
  })
}

export function normalizeFlashcardPillLabels(flashcards: CourseFlashcard[]): CourseFlashcard[] {
  return flashcards.map((fc) => ({
    ...fc,
    pillLabel: glossaryLabelFromFlashcard(fc.front, fc.back, fc.pillLabel),
  }))
}

export function normalizeQuickCheckPrompts(lesson: GeneratedLesson): GeneratedLesson {
  if (!lesson.quickCheck?.length) return lesson

  const quickCheck = lesson.quickCheck.map((item) => ({
    ...item,
    prompt: ensureFullQuickCheckPrompt(item.prompt),
  }))

  return { ...lesson, quickCheck }
}

export function insertPastPaperPracticeSection(
  lesson: GeneratedLesson,
  practice: PastPaperPracticeSection | null
): GeneratedLesson {
  if (!practice) return lesson

  const without = lesson.sections.filter((s) => s.type !== 'pastPaperPractice')
  const lastWorked = without.findLastIndex((s) => s.type === 'workedExample')
  const insertAt = lastWorked >= 0 ? lastWorked + 1 : without.length

  const sections: GeneratedLesson['sections'] = [
    ...without.slice(0, insertAt),
    practice,
    ...without.slice(insertAt),
  ]
  return { ...lesson, sections }
}

export function postProcessGeneratedLesson(
  lesson: GeneratedLesson,
  evidence: LessonEvidence,
  subjectCode: string,
  diagramsByQuestion: Map<string, WorkedExampleDiagram[]>
): GeneratedLesson {
  let out = attachDiagramsToWorkedExamples(lesson, diagramsByQuestion)
  out = {
    ...out,
    sections: removeOrphanHeadings(out.sections),
    flashcards: out.flashcards?.length
      ? normalizeFlashcardPillLabels(out.flashcards)
      : out.flashcards,
  }
  out = normalizeQuickCheckPrompts(out)
  out = insertPastPaperPracticeSection(
    out,
    buildPastPaperPracticeSection(evidence, subjectCode)
  )
  return attachCatalogVisuals(out)
}

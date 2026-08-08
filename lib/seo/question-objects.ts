/**
 * Copyright-safe examinable-unit pages.
 * Public pages use short previews + original examiner-style guidance — never full papers.
 */
import { createServiceClient } from '@/lib/supabase/service'
import { caieLessonPath, getCaieSubjectRef } from '@/lib/seo/caie-graph'
import { getCourseLessons } from '@/lib/courses'
import { isIndexableLesson } from '@/lib/seo/caie-graph'

export type QuestionObject = {
  slug: string
  subjectCode: string
  paperCode: string
  paperSession: string
  sessionLabel: string
  questionNumber: string
  totalMarks: number
  preview: string
  topicCode: string | null
  markHref: string
  lessonHref: string | null
}

const STEM_MAX = 160

export function buildQuestionSlug(
  paperCode: string,
  paperSession: string,
  questionNumber: string
): string {
  const session = paperSession
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const q = questionNumber.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return `${paperCode.toLowerCase()}-${session}-q${q}`
}

function excerpt(text: string | null | undefined): string {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  if (!t) return 'Past-paper question (preview unavailable).'
  return t.length > STEM_MAX ? `${t.slice(0, STEM_MAX).replace(/\s+\S*$/, '')}…` : t
}

function sessionLabel(paperSession: string): string {
  return paperSession.replace(/_/g, ' ')
}

function subjectFromPaper(paperCode: string): string {
  return paperCode.slice(0, 4)
}

function markHref(subject: string, paperCode: string, session: string, qnum: string) {
  return `/mark?subject=${encodeURIComponent(subject)}&paper=${encodeURIComponent(paperCode)}&session=${encodeURIComponent(session)}&question=${encodeURIComponent(qnum)}`
}

function lessonHrefForTopic(subject: string, topicCode: string | null): string | null {
  if (!topicCode) return null
  const lesson = getCourseLessons(subject).find(
    (l) => isIndexableLesson(l) && l.topicCode === topicCode
  )
  if (!lesson) return null
  return caieLessonPath(subject, lesson.slug) ?? `/courses/${subject}/${lesson.slug}`
}

type MarkSchemeRow = {
  paper_code: string
  paper_session: string
  question_number: string
  question_text: string | null
  total_marks: number | null
  syllabus_tags: string[] | null
}

export function rowToQuestionObject(row: MarkSchemeRow): QuestionObject {
  const subjectCode = subjectFromPaper(row.paper_code)
  const topicCode = row.syllabus_tags?.[0] ?? null
  return {
    slug: buildQuestionSlug(row.paper_code, row.paper_session, row.question_number),
    subjectCode,
    paperCode: row.paper_code,
    paperSession: row.paper_session,
    sessionLabel: sessionLabel(row.paper_session),
    questionNumber: row.question_number,
    totalMarks: row.total_marks ?? 0,
    preview: excerpt(row.question_text),
    topicCode,
    markHref: markHref(
      subjectCode,
      row.paper_code,
      row.paper_session,
      row.question_number
    ),
    lessonHref: lessonHrefForTopic(subjectCode, topicCode),
  }
}

/** Static params for high-value tagged questions (capped per subject). */
export async function listQuestionObjectSlugs(limitPerSubject = 40): Promise<string[]> {
  const admin = createServiceClient()
  const subjects = ['9709', '9702', '9701', '9700', '9708', '9609', '9618']
  const slugs: string[] = []

  for (const code of subjects) {
    const { data, error } = await admin
      .from('mark_schemes')
      .select('paper_code,paper_session,question_number,question_text,total_marks,syllabus_tags')
      .like('paper_code', `${code}%`)
      .not('question_text', 'is', null)
      .gte('total_marks', 2)
      .not('syllabus_tags', 'is', null)
      .order('total_marks', { ascending: false })
      .limit(limitPerSubject)

    if (error || !data) continue
    for (const row of data as MarkSchemeRow[]) {
      slugs.push(buildQuestionSlug(row.paper_code, row.paper_session, row.question_number))
    }
  }

  return [...new Set(slugs)]
}

export async function getQuestionObject(slug: string): Promise<QuestionObject | null> {
  // slug: 9702-42-o-n-2024-q6 or 9702_s23_qp_22 style paper codes embedded
  const m = slug.match(/^(\d{4})(.+)-q([a-z0-9]+)$/i)
  if (!m) return null
  const subject = m[1]
  const qnum = m[3]

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('mark_schemes')
    .select('paper_code,paper_session,question_number,question_text,total_marks,syllabus_tags')
    .like('paper_code', `${subject}%`)
    .ilike('question_number', qnum)
    .not('question_text', 'is', null)
    .limit(40)

  if (error || !data?.length) return null

  const match =
    (data as MarkSchemeRow[]).find(
      (row) => buildQuestionSlug(row.paper_code, row.paper_session, row.question_number) === slug
    ) ?? (data as MarkSchemeRow[])[0]

  return rowToQuestionObject(match)
}

export function getSubjectLabel(code: string): string {
  return getCaieSubjectRef(code)?.name ?? code
}

/**
 * Question-page intent: the examinable object (what is being asked).
 * Keep this distinct from markscheme guidance so Google does not cluster the pair.
 */
export function buildQuestionIntent(q: QuestionObject): {
  examinerAsk: string
  difficulty: string
  prerequisites: string[]
  similarPracticeHint: string
} {
  const topic = q.topicCode ? `syllabus ${q.topicCode}` : 'the linked topic'
  const marks = q.totalMarks
  const difficulty =
    marks >= 8 ? 'Extended / multi-step' : marks >= 4 ? 'Standard exam depth' : 'Short response'
  return {
    examinerAsk: `This ${q.paperCode} item (${marks} marks, ${q.sessionLabel}) is testing whether you can apply ${topic} under timed exam conditions — not whether you can recall a textbook paragraph. Read the command word, identify the quantity or argument required, and plan the mark-earning steps before you write.`,
    difficulty,
    prerequisites: [
      `Core definitions and relationships for ${topic}`,
      'Command-word literacy (state / describe / explain / calculate / deduce)',
      'Showing method lines examiners can credit even if the final answer slips',
    ],
    similarPracticeHint: `After you attempt this question, mark it, then take another ${q.subjectCode} past-paper item on the same topic so the weakness becomes a habit fix — not a one-off score.`,
  }
}

/** Original prose — assessment/feedback object, not a PDF dump and not a question clone. */
export function buildMarkschemeGuidance(q: QuestionObject): {
  howMarksWork: string
  commonLostMarks: string[]
  method: string
  alternatives: string
  remediation: string
} {
  const topic = q.topicCode ? `syllabus point ${q.topicCode}` : 'this topic'
  return {
    howMarksWork: `For ${q.paperCode} Q${q.questionNumber} (${q.totalMarks} marks), credit is awarded for examiner-visible method and a correct finish on ${topic}. Typical split: early method marks for a valid approach, later accuracy marks for the demanded quantity (with units/significant figures where the scheme requires them). Silent final answers usually forfeit method credit.`,
    commonLostMarks: [
      'Skipping the defining equation or first method line before substituting numbers.',
      'Using the wrong command-word depth (e.g. “state” vs “explain”).',
      'Losing the final accuracy mark through rounding, units, or significant figures.',
      'Answering a related quantity instead of the one the stem asked for.',
    ],
    method: `Mark against the official ${q.subjectCode} scheme for this paper/session: tick only what the scheme awards, then note which mark point failed. That failure map is the study plan — not a vague “revise the chapter.”`,
    alternatives: `Where the scheme allows equivalent methods, any valid approach that reaches the same demanded result can still earn method marks. Do not force one textbook route if your working is mathematically equivalent and examiner-readable.`,
    remediation: `Close the gap on ${topic} with the linked lesson, then re-mark a fresh attempt. The win condition is earning the previously missed mark points — not rereading notes without another timed try.`,
  }
}

import { createServiceClient } from '@/lib/supabase-server'
import { paperNumberFromComponent } from '@/lib/extraction/paper-meta'
import { parsePaperCode } from '@/lib/marking/component-types'
import { seasonNameFromSessionCode, sessionCodeToYear } from '@/lib/marking/session'

export type AnchorKind = 'subject' | 'topic' | 'lesson' | 'paper_question'

export type CommunityAnchor = {
  kind: AnchorKind
  label: string
  href?: string
  subjectCode?: string
  topicCode?: string | null
  questionId?: string | null
}

export async function resolveQuestionAnchor(questionId: string): Promise<CommunityAnchor | null> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('extracted_questions')
    .select('id, subject_code, year, session, paper_number, variant, question_number')
    .eq('id', questionId)
    .maybeSingle()
  if (!data) return null
  const label = `${data.subject_code} · ${data.session} ${data.year} P${data.paper_number} Q${data.question_number}`
  return {
    kind: 'paper_question',
    label,
    href: `/mark?subject=${data.subject_code}`,
    subjectCode: data.subject_code,
    questionId: data.id,
  }
}

export function resolveTopicAnchor(subjectCode: string, topicCode: string, topicName?: string): CommunityAnchor {
  return {
    kind: 'topic',
    label: topicName ? `${topicCode} ${topicName}` : topicCode,
    href: `/courses/${subjectCode}`,
    subjectCode,
    topicCode,
  }
}

export function resolveLessonAnchor(
  subjectCode: string,
  lessonSlug: string,
  lessonTitle?: string
): CommunityAnchor {
  return {
    kind: 'lesson',
    label: lessonTitle ?? lessonSlug.replace(/-/g, ' '),
    href: `/courses/${subjectCode}/${lessonSlug}`,
    subjectCode,
  }
}

export function formatAnchorBadge(anchor: CommunityAnchor): string {
  if (anchor.kind === 'paper_question') return `Past paper · ${anchor.label}`
  if (anchor.kind === 'topic') return `Topic · ${anchor.label}`
  if (anchor.kind === 'lesson') return `Lesson · ${anchor.label}`
  return anchor.label
}

function sessionVariantsFromPaperSession(paperSession: string): { year: number; sessions: string[] } | null {
  const long = paperSession.match(
    /(May\/June|October\/November|February\/March)\s+(\d{4})/i
  )
  if (long) {
    const [, season, yearStr] = long
    const year = Number(yearStr)
    const lowered = season.toLowerCase()
    const sessions =
      lowered.includes('may')
        ? ['May/June']
        : lowered.includes('october')
          ? ['October/November', 'Oct/Nov']
          : ['February/March', 'Feb/March']
    return { year, sessions }
  }
  const compact = paperSession.trim().toLowerCase().match(/^([smw])(\d{2})$/)
  if (compact) {
    const code = `${compact[1]}${compact[2]}`
    const year = sessionCodeToYear(code)
    const session = seasonNameFromSessionCode(code)
    if (year && session) return { year, sessions: [session] }
  }
  return null
}

/** Resolve extracted_questions.id from mark-scheme paper metadata (best-effort). */
export async function resolveExtractedQuestionId(input: {
  paperCode: string
  paperSession: string
  questionNumber: string
}): Promise<string | null> {
  const parsed = parsePaperCode(input.paperCode)
  const sessionMeta = sessionVariantsFromPaperSession(input.paperSession)
  if (!parsed || !sessionMeta) return null

  const admin = createServiceClient()
  const { data } = await admin
    .from('extracted_questions')
    .select('id')
    .eq('subject_code', parsed.subjectCode)
    .eq('paper_number', paperNumberFromComponent(parsed.component))
    .eq('variant', parsed.component)
    .eq('year', sessionMeta.year)
    .in('session', sessionMeta.sessions)
    .eq('question_number', input.questionNumber)
    .maybeSingle()
  return (data?.id as string) ?? null
}

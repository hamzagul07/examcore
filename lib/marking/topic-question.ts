import type { SupabaseClient } from '@supabase/supabase-js'
import { getStaticTopicFallback } from '@/lib/marking/topic-fallbacks'
import {
  seasonNameFromSessionCode,
  sessionCodeToYear,
} from '@/lib/marking/session'

export type TopicQuestionMatch = {
  paper_code: string
  paper_session: string
  question_number: string
  question_text: string | null
  total_marks: number | null
  matched_topic: string
}

/** Walk up the syllabus tree — 5.4.4 → 5.4 → 5 — until a tagged question is found. */
export function topicLookupCodes(topicCode: string): string[] {
  const normalized = topicCode.trim()
  if (!normalized) return []
  const codes = [normalized]
  let current = normalized
  while (current.includes('.')) {
    current = current.replace(/\.[^.]+$/, '')
    if (!codes.includes(current)) codes.push(current)
  }
  return codes
}

export async function findQuestionForTopic(
  supabase: SupabaseClient,
  subjectCode: string,
  topicCode: string
): Promise<TopicQuestionMatch | null> {
  const subject = subjectCode.trim()
  const codes = topicLookupCodes(topicCode)
  if (!subject || codes.length === 0) return null

  for (const code of codes) {
    const { data, error } = await supabase
      .from('mark_schemes')
      .select(
        'paper_code, paper_session, question_number, question_text, total_marks, syllabus_tags'
      )
      .like('paper_code', `${subject}/%`)
      .contains('syllabus_tags', [code])
      .gte('total_marks', 2)
      .lte('total_marks', 10)
      .order('total_marks', { ascending: true })
      .limit(1)

    if (error) throw new Error(error.message)
    const row = data?.[0]
    if (row?.paper_code && row.paper_session && row.question_number) {
      return {
        paper_code: row.paper_code,
        paper_session: row.paper_session,
        question_number: row.question_number,
        question_text: row.question_text ?? null,
        total_marks: row.total_marks ?? null,
        matched_topic: code,
      }
    }
  }

  const staticFallback = getStaticTopicFallback(subject, codes)
  if (staticFallback) return staticFallback

  const { data: fallback, error: fallbackError } = await supabase
    .from('mark_schemes')
    .select(
      'paper_code, paper_session, question_number, question_text, total_marks, syllabus_tags'
    )
    .like('paper_code', `${subject}/%`)
    .gte('total_marks', 2)
    .lte('total_marks', 6)
    .limit(1)

  if (fallbackError) throw new Error(fallbackError.message)
  const row = fallback?.[0]
  if (!row?.paper_code || !row.paper_session || !row.question_number) return null

  return {
    paper_code: row.paper_code,
    paper_session: row.paper_session,
    question_number: row.question_number,
    question_text: row.question_text ?? null,
    total_marks: row.total_marks ?? null,
    matched_topic: codes[0],
  }
}

function parsePaperSession(
  paperSession: string
): { session: string; year: number } | null {
  const trimmed = paperSession.trim()
  const longMatch = trimmed.match(/^(May\/June|October\/November|February\/March|June|November|March)\s+(\d{4})$/i)
  if (longMatch) {
    const raw = longMatch[1]
    const session =
      raw.includes('/')
        ? raw
        : raw.toLowerCase() === 'june'
          ? 'May/June'
          : raw.toLowerCase() === 'november'
            ? 'October/November'
            : raw.toLowerCase() === 'march'
              ? 'February/March'
              : raw
    return { session, year: Number(longMatch[2]) }
  }
  const compact = trimmed.match(/^([smw])(\d{2})$/i)
  if (compact) {
    const code = compact[0].toLowerCase()
    const year = sessionCodeToYear(code)
    const session = seasonNameFromSessionCode(code)
    if (year && session) return { session, year }
  }
  return null
}

export function applyTopicQuestionToPaperSelection(match: TopicQuestionMatch): {
  subject: string
  component: string
  session: string
  year: number
  questionNumber: string
} | null {
  const [subject, component] = match.paper_code.split('/')
  if (!subject || !component) return null
  const parsed = parsePaperSession(match.paper_session)
  if (!parsed) return null
  return {
    subject,
    component,
    session: parsed.session,
    year: parsed.year,
    questionNumber: match.question_number,
  }
}

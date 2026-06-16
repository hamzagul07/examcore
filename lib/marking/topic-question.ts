import type { SupabaseClient } from '@supabase/supabase-js'

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

export function applyTopicQuestionToPaperSelection(match: TopicQuestionMatch): {
  subject: string
  component: string
  session: string
  year: number
  questionNumber: string
} | null {
  const [subject, component] = match.paper_code.split('/')
  if (!subject || !component) return null
  const sessionMatch = match.paper_session.match(/^(.*)\s+(\d{4})$/i)
  if (!sessionMatch) return null
  return {
    subject,
    component,
    session: sessionMatch[1],
    year: Number(sessionMatch[2]),
    questionNumber: match.question_number,
  }
}

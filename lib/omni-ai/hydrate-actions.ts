import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { inferTopicCode, type ChatAction } from '@/lib/chat-intents'
import { MOCK_DIAGNOSTIC, MOCK_PAPER } from '@/lib/chat-mock-data'
import { getSyllabusTopicByCode } from '@/lib/syllabus'
import type { OmniAIAction } from './types'

const SESSION_PHRASES: Array<{ pattern: RegExp; session: string }> = [
  { pattern: /may[ /-]?june\s*(20)?(\d{2})/i, session: 'May/June' },
  {
    pattern: /oct(ober)?[ /-]?nov(ember)?\s*(20)?(\d{2})/i,
    session: 'October/November',
  },
  { pattern: /feb(ruary)?[ /-]?march\s*(20)?(\d{2})/i, session: 'February/March' },
  { pattern: /\bm\/j\s*(20)?(\d{2})/i, session: 'May/June' },
  { pattern: /\bo\/n\s*(20)?(\d{2})/i, session: 'October/November' },
  { pattern: /\bf\/m\s*(20)?(\d{2})/i, session: 'February/March' },
]

function extractPaperIdentifier(query: string): {
  paper_code: string
  paper_session: string
  question_number: string
} | null {
  const codeMatch = query.match(/\b(9709|9231|9702|9701|9700)\s*[/\-]?\s*(\d{1,2})\b/i)
  const subject = codeMatch?.[1] || '9709'
  const componentRaw = codeMatch?.[2]

  let session: string | null = null
  for (const { pattern, session: name } of SESSION_PHRASES) {
    const m = query.match(pattern)
    if (m) {
      const yearMatch = m[0].match(/(\d{2})\s*$/) || m[0].match(/(\d{4})\s*$/)
      const year = yearMatch ? yearMatch[1].slice(-2) : ''
      if (year) session = `${name} 20${year}`
      break
    }
  }

  const qMatch =
    query.match(/\bq(?:uestion)?\.?\s*(\d{1,2}(?:\([a-z]\))?(?:\([ivx]+\))?)/i) ||
    query.match(/\bnumber\s*(\d{1,2})\b/i)
  const questionNumber = qMatch?.[1]?.toLowerCase()

  if (!componentRaw || !session || !questionNumber) return null

  return {
    paper_code: `${subject}/${componentRaw.padStart(2, '0')}`,
    paper_session: session,
    question_number: questionNumber,
  }
}

type DbPaperRow = {
  paper_code: string | null
  paper_session: string | null
  question_number: string | null
  question_text: string | null
  total_marks: number | null
  syllabus_tags: string[] | null
}

function mapDbRowToPaperPayload(row: DbPaperRow) {
  const [subjectCode, componentRaw] = (row.paper_code || '9709/12').split('/')
  return {
    subject_code: subjectCode || '9709',
    session: row.paper_session || 'May/June 2024',
    paper: `Paper ${componentRaw || '12'}`,
    question_number: row.question_number || '1',
    question_text: row.question_text || '',
    total_marks: typeof row.total_marks === 'number' ? row.total_marks : 0,
    syllabus_tags: Array.isArray(row.syllabus_tags) ? row.syllabus_tags : [],
  }
}

export async function hydrateOmniAction(
  action: OmniAIAction,
  query: string,
  supabase: SupabaseClient | null
): Promise<OmniAIAction> {
  if (action.type === 'render_paper') {
    const params = action.params || {}
    if (!supabase) {
      action.paper = MOCK_PAPER
      return action
    }

    if (params.paper_code && params.paper_session && params.question_number) {
      const { data } = await supabase
        .from('mark_schemes')
        .select(
          'paper_code, paper_session, question_number, question_text, total_marks, syllabus_tags'
        )
        .eq('paper_code', params.paper_code)
        .eq('paper_session', params.paper_session)
        .eq('question_number', params.question_number)
        .maybeSingle()
      if (data) {
        action.paper = mapDbRowToPaperPayload(data)
        return action
      }
    }

    const ident = extractPaperIdentifier(query)
    if (ident) {
      const { data } = await supabase
        .from('mark_schemes')
        .select(
          'paper_code, paper_session, question_number, question_text, total_marks, syllabus_tags'
        )
        .eq('paper_code', ident.paper_code)
        .eq('paper_session', ident.paper_session)
        .eq('question_number', ident.question_number)
        .maybeSingle()
      if (data) {
        action.paper = mapDbRowToPaperPayload(data)
        return action
      }
    }

    const { data } = await supabase
      .from('mark_schemes')
      .select(
        'paper_code, paper_session, question_number, question_text, total_marks, syllabus_tags'
      )
      .gte('total_marks', 2)
      .lte('total_marks', 5)
      .limit(1)

    action.paper = data?.[0] ? mapDbRowToPaperPayload(data[0]) : MOCK_PAPER
    return action
  }

  if (action.type === 'render_diagnostic') {
    const topicHint = action.params?.topic_hint || ''
    const topicCode = inferTopicCode(topicHint)
    const topic = getSyllabusTopicByCode(topicCode)
    const topicName =
      topicHint.trim() ||
      (topic ? `${topic.name} (${topic.paperName})` : 'Diagnostic')

    if (!supabase) {
      action.diagnostic = {
        ...MOCK_DIAGNOSTIC,
        topic_code: topicCode,
        topic_name: topicName,
      }
      return action
    }

    const { data } = await supabase
      .from('mark_schemes')
      .select('question_text, total_marks, syllabus_tags')
      .contains('syllabus_tags', [topicCode])
      .gte('total_marks', 2)
      .lte('total_marks', 5)
      .limit(1)

    if (data?.[0]?.question_text) {
      action.diagnostic = {
        topic_code: topicCode,
        topic_name: topicName,
        question_text: data[0].question_text,
        total_marks: typeof data[0].total_marks === 'number' ? data[0].total_marks : 3,
      }
    } else {
      action.diagnostic = {
        ...MOCK_DIAGNOSTIC,
        topic_code: topicCode,
        topic_name: topicName,
      }
    }
  }

  return action
}

/** Re-export for legacy chat route if needed. */
export type { ChatAction }

export function createSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

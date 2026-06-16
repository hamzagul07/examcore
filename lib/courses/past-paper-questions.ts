import { createServiceClient } from '@/lib/supabase/service'
import type { PastPaperQuestionRef } from '@/lib/courses/types'
import { buildMarkHref, formatPaperSession } from '@/lib/courses/format-session'
import { getStaticTopicFallback } from '@/lib/marking/topic-fallbacks'
import { topicLookupCodes } from '@/lib/marking/topic-question'

type DbRow = {
  paper_code: string | null
  paper_session: string | null
  question_number: string | null
  question_text: string | null
  total_marks: number | null
}

const FALLBACK_QUESTIONS: Record<string, PastPaperQuestionRef[]> = {
  '9709:1.7': [
    {
      paperCode: '9709/12',
      paperSession: 's23',
      sessionLabel: 'June 2023',
      questionNumber: '5',
      questionText:
        'A curve has equation y = x³ − 6x² + 9x + 2. Find the coordinates of the stationary points and determine their nature.',
      totalMarks: 7,
      markHref: '/mark?subject=9709&paper=9709%2F12&session=s23&question=5',
    },
  ],
  '9702:9.1': [
    {
      paperCode: '9702/21',
      paperSession: 's23',
      sessionLabel: 'June 2023',
      questionNumber: '4',
      questionText:
        'A resistor of resistance 12 Ω is connected in series with two resistors of resistance 6.0 Ω and 4.0 Ω. Calculate the total resistance and the current when a 9.0 V supply is connected across the combination.',
      totalMarks: 4,
      markHref: '/mark?subject=9702&paper=9702%2F21&session=s23&question=4',
    },
  ],
}

function staticFallbackToRef(
  subjectCode: string,
  topicCode: string
): PastPaperQuestionRef[] {
  const match = getStaticTopicFallback(subjectCode, topicLookupCodes(topicCode))
  if (!match?.question_text) return []
  const sessionCode =
    match.paper_session.match(/^([smw]\d{2})$/i)?.[0]?.toLowerCase() ??
    (match.paper_session.includes('June') ? 's23' : 'w23')
  return [
    {
      paperCode: match.paper_code,
      paperSession: sessionCode,
      sessionLabel: formatPaperSession(sessionCode),
      questionNumber: match.question_number,
      questionText: match.question_text,
      totalMarks: match.total_marks ?? 8,
      markHref: buildMarkHref(
        subjectCode,
        match.paper_code,
        sessionCode,
        match.question_number
      ),
    },
  ]
}

export async function fetchPastPaperQuestionsForTopic(
  subjectCode: string,
  topicCode: string,
  limit = 2
): Promise<PastPaperQuestionRef[]> {
  const fallbackKey = `${subjectCode}:${topicCode}`
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('mark_schemes')
      .select(
        'paper_code, paper_session, question_number, question_text, total_marks'
      )
      .like('paper_code', `${subjectCode}%`)
      .contains('syllabus_tags', [topicCode])
      .not('question_text', 'is', null)
      .gte('total_marks', 2)
      .lte('total_marks', 12)
      .order('total_marks', { ascending: true })
      .limit(limit)

    if (error || !data?.length) {
      return (
        FALLBACK_QUESTIONS[fallbackKey]?.slice(0, limit) ??
        staticFallbackToRef(subjectCode, topicCode).slice(0, limit)
      )
    }

    return data
      .filter((row): row is DbRow & { question_text: string } => !!row.question_text)
      .map((row) => {
        const paperCode = row.paper_code || `${subjectCode}/12`
        const paperSession = row.paper_session || 's23'
        const questionNumber = row.question_number || '1'
        return {
          paperCode,
          paperSession,
          sessionLabel: formatPaperSession(paperSession),
          questionNumber,
          questionText: row.question_text,
          totalMarks: row.total_marks ?? 0,
          markHref: buildMarkHref(
            subjectCode,
            paperCode,
            paperSession,
            questionNumber
          ),
        }
      })
  } catch {
    return (
      FALLBACK_QUESTIONS[fallbackKey]?.slice(0, limit) ??
      staticFallbackToRef(subjectCode, topicCode).slice(0, limit)
    )
  }
}

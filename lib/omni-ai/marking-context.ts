import type { SupabaseClient } from '@supabase/supabase-js'
import type { LorBandResult, MarkingAIResult, WholePaperResult } from '@/lib/marking/types'

export type AttemptRowForOmni = {
  id: string
  user_id: string | null
  question_text: string | null
  ocr_text: string | null
  ai_marking: unknown
  marks_earned: number
  total_marks: number
  syllabus_tags: string[] | null
  created_at: string
  mark_schemes: {
    subject: string | null
    paper_code: string | null
    paper_session: string | null
    question_number: string | null
    question_text: string | null
    mark_scheme: Record<string, unknown> | null
    total_marks: number | null
  } | null
}

function isWholePaper(ai: unknown): ai is WholePaperResult {
  return (
    !!ai &&
    typeof ai === 'object' &&
    (ai as WholePaperResult).upload_mode === 'whole_paper'
  )
}

function formatSingleQuestionMarking(ai: MarkingAIResult): string {
  const parts: string[] = []
  parts.push(`Summary: ${ai.summary}`)
  if (ai.band_result) {
    const b = ai.band_result
    parts.push(
      `Band ${b.level}: ${b.marks_awarded}/${b.marks_available} — ${b.justification}`
    )
    if (b.strengths?.length) {
      parts.push(`Strengths: ${b.strengths.join('; ')}`)
    }
    if (b.improvements?.length) {
      parts.push(`Improvements: ${b.improvements.join('; ')}`)
    }
  }
  if (ai.marks_awarded?.length) {
    parts.push('Per-mark breakdown:')
    for (const m of ai.marks_awarded) {
      parts.push(
        `- ${m.type} (${m.earned ? 'earned' : 'not earned'}): ${m.reasoning}${
          m.margin_note ? ` [note: ${m.margin_note}]` : ''
        }${m.error_classification ? ` [error: ${m.error_classification}]` : ''}`
      )
    }
  }
  if (ai.mcq_breakdown?.length) {
    parts.push('MCQ breakdown:')
    for (const row of ai.mcq_breakdown) {
      parts.push(
        `- Q${row.question_number}: student ${row.student_answer}, correct ${row.correct_answer} — ${row.correct ? 'correct' : 'wrong'}`
      )
    }
  }
  if (ai.weak_topics?.length) {
    parts.push(`Weak topics: ${ai.weak_topics.join('; ')}`)
  }
  if (ai.what_to_study_next) {
    parts.push(`What to study next: ${ai.what_to_study_next}`)
  }
  if (ai.estimated_marks_explanation) {
    parts.push(`Marking note: ${ai.estimated_marks_explanation}`)
  }
  return parts.join('\n')
}

function formatWholePaperMarking(wp: WholePaperResult): string {
  const parts: string[] = [
    `Whole paper: ${wp.paper_code ?? '?'} ${wp.paper_session ?? ''}`,
    `Score: ${wp.marks_earned}/${wp.total_marks} (${wp.percentage}%)`,
    `Summary: ${wp.summary}`,
  ]
  for (const q of wp.questions ?? []) {
    if (q.status === 'unattempted' || q.status === 'marking_failed') {
      parts.push(
        `- Q${q.question_number}: ${q.status} (${q.marks_earned}/${q.total_marks})`
      )
      continue
    }
    parts.push(
      `- Q${q.question_number} (${q.marking_style}): ${q.marks_earned}/${q.total_marks} — ${q.summary}`
    )
    const ai = q.ai_marking
    if (ai.band_result) {
      parts.push(
        `  Band ${ai.band_result.level}: ${ai.band_result.justification}`
      )
    }
    if (ai.marks_awarded?.length) {
      for (const m of ai.marks_awarded) {
        parts.push(
          `  ${m.type} (${m.earned ? 'earned' : 'lost'}): ${m.reasoning}`
        )
      }
    }
  }
  return parts.join('\n')
}

export function formatAttemptForPrompt(row: AttemptRowForOmni): string {
  const ms = row.mark_schemes
  const paperLine = ms
    ? `${ms.subject ?? ''} ${ms.paper_code ?? ''} ${ms.paper_session ?? ''} Q${ms.question_number ?? '?'}`
    : 'General criteria marking'

  const schemeText = ms?.mark_scheme
    ? JSON.stringify(ms.mark_scheme).slice(0, 8000)
    : '(no official mark scheme row linked)'

  const ai = row.ai_marking
  const markingDetail = isWholePaper(ai)
    ? formatWholePaperMarking(ai)
    : formatSingleQuestionMarking(ai as MarkingAIResult)

  return `ATTEMPT ID: ${row.id}
Paper: ${paperLine}
Score: ${row.marks_earned}/${row.total_marks}
Syllabus tags: ${(row.syllabus_tags ?? []).join(', ') || 'none'}
Question text: ${(row.question_text || ms?.question_text || '').slice(0, 4000)}
Student answer (OCR): ${(row.ocr_text || '').slice(0, 4000)}
Official mark scheme (JSON excerpt): ${schemeText}

MARKING OUTPUT:
${markingDetail}`
}

/** Load one attempt for the signed-in user only (explicit user_id filter). */
export async function loadAttemptForOmni(
  supabase: SupabaseClient,
  attemptId: string,
  userId: string
): Promise<AttemptRowForOmni | null> {
  const { data, error } = await supabase
    .from('attempts')
    .select(
      `
      id, user_id, question_text, ocr_text, ai_marking,
      marks_earned, total_marks, syllabus_tags, created_at,
      mark_schemes (
        subject, paper_code, paper_session, question_number,
        question_text, mark_scheme, total_marks
      )
    `
    )
    .eq('id', attemptId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  const row = data as Record<string, unknown>
  const ms = row.mark_schemes
  if (Array.isArray(ms)) {
    row.mark_schemes = ms[0] ?? null
  }
  return row as unknown as AttemptRowForOmni
}

export type FetchRecentAttemptsInput = {
  subject_code?: string
  topic_code?: string
  limit?: number
}

export async function fetchRecentAttemptsForUser(
  supabase: SupabaseClient,
  userId: string,
  input: FetchRecentAttemptsInput
): Promise<{ attempts: Record<string, unknown>[]; error?: string }> {
  const limit = Math.min(10, Math.max(1, input.limit ?? 5))

  const query = supabase
    .from('attempts')
    .select(
      `
      id, marks_earned, total_marks, question_text, ocr_text, ai_marking,
      syllabus_tags, created_at,
      mark_schemes ( subject, paper_code, paper_session, question_number )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data, error } = await query

  if (error) {
    return { attempts: [], error: error.message }
  }

  let rows = (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>
    const ms = row.mark_schemes
    if (Array.isArray(ms)) {
      row.mark_schemes = ms[0] ?? null
    }
    return row as unknown as AttemptRowForOmni
  })

  if (input.subject_code?.trim()) {
    const code = input.subject_code.trim().toLowerCase()
    rows = rows.filter((r) => {
      const ms = r.mark_schemes
      if (!ms) return false
      return (
        (ms.paper_code ?? '').toLowerCase().includes(code) ||
        (ms.subject ?? '').toLowerCase().includes(code)
      )
    })
  }

  if (input.topic_code?.trim()) {
    const topic = input.topic_code.trim()
    rows = rows.filter((r) =>
      (r.syllabus_tags ?? []).some((t) => String(t).includes(topic))
    )
  }

  const attempts = rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    score: `${row.marks_earned}/${row.total_marks}`,
    paper: row.mark_schemes
      ? `${row.mark_schemes.paper_code} ${row.mark_schemes.paper_session} Q${row.mark_schemes.question_number}`
      : null,
    syllabus_tags: row.syllabus_tags,
    summary_excerpt: isWholePaper(row.ai_marking)
      ? (row.ai_marking as WholePaperResult).summary?.slice(0, 500)
      : (row.ai_marking as MarkingAIResult)?.summary?.slice(0, 500),
    marking_detail: formatAttemptForPrompt(row as AttemptRowForOmni),
  }))

  return { attempts }
}

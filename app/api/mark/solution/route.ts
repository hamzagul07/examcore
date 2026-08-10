import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateGeminiText } from '@/lib/ai/gemini-text'
import { buildSolutionSchemeHints } from '@/lib/marking/solution-scheme-hints'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'

export const maxDuration = 60

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type AttemptRow = {
  id: string
  user_id: string | null
  question_text: string | null
  ocr_text: string | null
  full_solution: string | null
  mark_scheme_id: string | null
  total_marks: number | null
  marks_earned: number | null
  ai_marking: {
    marks_awarded?: Array<{
      type?: string
      earned?: boolean
      reasoning?: string
      line_reference?: string
      description?: string
    }>
    total_marks?: number
    summary?: string
  } | null
  mark_schemes: {
    question_text: string | null
    total_marks: number | null
    mark_scheme: unknown
  } | null
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err || '')
  // Browser/runtime cookie + URLPattern noise — never show raw to students.
  if (/did not match the expected pattern/i.test(message)) {
    return 'Could not generate the solution just now. Please try again.'
  }
  if (/timeout|ETIMEDOUT|aborted/i.test(message)) {
    return 'Solution generation timed out. Please try again.'
  }
  if (/429|resource exhausted|rate/i.test(message)) {
    return 'The marker is busy. Wait a few seconds and try again.'
  }
  return message || 'Could not generate a solution.'
}

function buildSchemeHints(attempt: AttemptRow): string {
  return buildSolutionSchemeHints({
    officialScheme: attempt.mark_schemes?.mark_scheme,
    officialTotal: attempt.mark_schemes?.total_marks,
    awards: attempt.ai_marking?.marks_awarded,
    attemptTotal: attempt.total_marks,
    aiTotal: attempt.ai_marking?.total_marks,
  })
}

function buildSolutionPrompt(params: {
  questionText: string
  schemeBlock: string
  studentWorking: string
}): string {
  const workingBlock = params.studentWorking
    ? `
The student already submitted this working (may be incomplete or wrong). Write a CLEAN full-marks version they can learn from — do not copy their mistakes:
"""
${params.studentWorking.slice(0, 3500)}
"""
`
    : ''

  return `You write FULL-MARKS exam answers for Cambridge / IB students.

Tone and shape — critical:
- Write as a strong student sitting the real exam: clear, calm, correct.
- Show the answer they would put on the answer booklet / lined paper.
- Use short labels and neat columns where Accounting / Business needs a statement.
- Show brief workings in brackets or under the figures (e.g. 10,000 × \$30).
- NO tutor voice ("you should", "remember that", "Step 1: first we…").
- NO examiner codes (M1, A1, B1) and no "why this earns the mark" commentary.
- NO preamble ("Here is the solution").
- Keep it understandable for a 16–18 year old: plain words, correct terms, no waffle.

Question:
${params.questionText}
${workingBlock}
${params.schemeBlock}

Format (markdown only):
- Start with a one-line title like **Marginal costing statement — Option A** (adapt to the question).
- Then the worked answer itself (statement, calculation steps, or short paragraphs).
- Use \$...\$ / \$\$...\$\$ for maths when needed.
- End with a single bold line: **Answer: …** (the final figure, conclusion, or required output).

Return ONLY that exam answer as markdown.`
}

export async function POST(request: NextRequest) {
  try {
    let attemptId: string | undefined
    try {
      const body = await request.json()
      attemptId = typeof body?.attempt_id === 'string' ? body.attempt_id.trim() : undefined
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!attemptId) {
      return NextResponse.json(
        { error: 'attempt_id is required' },
        { status: 400 }
      )
    }

    if (!UUID_RE.test(attemptId)) {
      return NextResponse.json(
        { error: 'That attempt could not be found. Mark the question again, then open the solution.' },
        { status: 400 }
      )
    }

    const { user, pendingCookies } = await authenticateRouteRequest(request)
    if (!user) {
      return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
        status: 401,
      })
    }

    const { data: attempt, error: fetchError } = await supabaseAdmin
      .from('attempts')
      .select(
        `
        id, user_id, question_text, ocr_text, full_solution, mark_scheme_id,
        total_marks, marks_earned, ai_marking,
        mark_schemes ( question_text, total_marks, mark_scheme )
      `
      )
      .eq('id', attemptId)
      .maybeSingle<AttemptRow>()

    if (fetchError) {
      console.error('[solution] fetch failed:', fetchError)
      return NextResponse.json(
        { error: 'Could not load this attempt. Try again.' },
        { status: 500 }
      )
    }

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (attempt.full_solution && attempt.full_solution.trim().length > 0) {
      return jsonWithAuthCookies(
        { solution: attempt.full_solution, cached: true },
        pendingCookies
      )
    }

    const questionText = (
      attempt.question_text ||
      attempt.mark_schemes?.question_text ||
      ''
    ).trim()

    // Freeform uploads sometimes store a thin stem; OCR + mark points still
    // carry enough to write a model script.
    const studentWorking = (attempt.ocr_text || '').trim()
    if (questionText.length < 5 && studentWorking.length < 20) {
      return NextResponse.json(
        {
          error:
            'No question text was saved with this attempt, so we can\'t generate a solution.',
        },
        { status: 400 }
      )
    }

    const effectiveQuestion =
      questionText.length >= 5
        ? questionText
        : `Exam question (wording recovered from the script / mark points):\n${studentWorking.slice(0, 1200)}`

    const prompt = buildSolutionPrompt({
      questionText: effectiveQuestion,
      schemeBlock: buildSchemeHints(attempt),
      studentWorking:
        studentWorking && studentWorking !== questionText ? studentWorking : '',
    })

    const solution = (
      await generateGeminiText(prompt, {
        task: 'solution',
        maxOutputTokens: 5000,
        temperature: 0.2,
      })
    ).trim()

    if (!solution) {
      return NextResponse.json(
        { error: 'The model returned an empty solution. Try again.' },
        { status: 502 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('attempts')
      .update({ full_solution: solution })
      .eq('id', attempt.id)

    if (updateError) {
      console.error('[solution] Failed to persist full_solution:', updateError)
    }

    return jsonWithAuthCookies({ solution, cached: false }, pendingCookies)
  } catch (err) {
    console.error('[solution] generation error:', err)
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 })
  }
}

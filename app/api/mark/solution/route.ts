import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateGeminiText } from '@/lib/ai/gemini-text'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'

export const maxDuration = 60

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
  mark_schemes: {
    question_text: string | null
    total_marks: number | null
    mark_scheme: unknown
  } | null
}

export async function POST(request: NextRequest) {
  try {
    let attemptId: string | undefined
    try {
      const body = await request.json()
      attemptId = body?.attempt_id
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!attemptId || typeof attemptId !== 'string') {
      return NextResponse.json(
        { error: 'attempt_id is required' },
        { status: 400 }
      )
    }

    // Auth: only the owner can generate/read a solution for their attempt.
    const { user, pendingCookies } = await authenticateRouteRequest(request)
    if (!user) {
      return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
        status: 401,
      })
    }

    // Fetch the attempt + joined mark scheme via service role.
    const { data: attempt, error: fetchError } = await supabaseAdmin
      .from('attempts')
      .select(
        `
        id, user_id, question_text, ocr_text, full_solution, mark_scheme_id,
        mark_schemes ( question_text, total_marks, mark_scheme )
      `
      )
      .eq('id', attemptId)
      .maybeSingle<AttemptRow>()

    if (fetchError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Cache hit — return stored solution.
    if (attempt.full_solution && attempt.full_solution.trim().length > 0) {
      return NextResponse.json({ solution: attempt.full_solution, cached: true })
    }

    // Compose the question + scheme context for Gemini.
    const questionText =
      attempt.question_text || attempt.mark_schemes?.question_text || ''
    if (!questionText || questionText.trim().length < 5) {
      return NextResponse.json(
        {
          error:
            'No question text was saved with this attempt, so we can\'t generate a solution.',
        },
        { status: 400 }
      )
    }

    const markSchemeBlock = attempt.mark_schemes?.mark_scheme
      ? `Marking criteria (for reference, to ensure your solution earns full marks):
${JSON.stringify(attempt.mark_schemes.mark_scheme, null, 2)}

Total marks available: ${attempt.mark_schemes.total_marks ?? '(unknown)'}
`
      : ''

    const prompt = `You are an expert Cambridge A-Level Mathematics tutor. Generate a complete step-by-step worked solution to the following question.

Question:
${questionText}

${markSchemeBlock}

Generate a clear, educational worked solution that a student can learn from. Requirements:

1. SHOW EVERY STEP. Don't skip algebra steps. Students need to see how each line leads to the next.

2. EXPLAIN THE REASONING. Before each major step, briefly explain WHY you're doing it (e.g., "We need to find the coefficient of $x^2$, so we'll use the binomial expansion formula...")

3. USE PROPER LATEX MATH NOTATION:
   - Wrap inline math in $...$ (e.g., $x^2$, $\\binom{6}{2}$, $\\frac{a}{b}$)
   - Wrap displayed equations in $$...$$ for important results
   - Use proper notation: \\binom for binomial coefficients, \\frac for fractions, \\sqrt for roots, \\pi for pi, etc.
   - NEVER write math as plain text like "x^2" or "sqrt(16)" — always use LaTeX

4. STRUCTURE THE SOLUTION as markdown:
   - Start with a brief overview of the approach (1-2 sentences)
   - Break into clearly labeled steps using markdown headers: ### Step 1, ### Step 2, etc.
   - End with the final answer in **bold**
   - Optionally add a short "**Why this works**" note at the end

5. STUDENT-FRIENDLY TONE:
   - Address the student as "you" or "we"
   - Be encouraging where natural
   - Clear and patient, like a good tutor explaining
   - Avoid examiner jargon (B1/M1/A1) — that's for marking, not teaching

OUTPUT FORMAT:
Return ONLY the worked solution as plain markdown text. Do NOT wrap in JSON. Do NOT include any preamble like "Here is the solution:". Start directly with the overview sentence.`

    const solution = await generateGeminiText(prompt, {
      task: 'solution',
      maxOutputTokens: 4000,
    })

    if (!solution) {
      return NextResponse.json(
        { error: 'The model returned an empty solution. Try again.' },
        { status: 502 }
      )
    }

    // Persist for next time.
    const { error: updateError } = await supabaseAdmin
      .from('attempts')
      .update({ full_solution: solution })
      .eq('id', attempt.id)

    if (updateError) {
      // Log but don't fail — the user still gets the generated solution.
      console.error('Failed to persist full_solution:', updateError)
    }

    return NextResponse.json({ solution, cached: false })
  } catch (err) {
    console.error('Solution generation error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

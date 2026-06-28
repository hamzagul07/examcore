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

    const prompt = `You are an expert exam tutor and examiner across Cambridge and IB subjects. Produce a complete model answer / worked solution to the following exam question that would earn full marks. Work out the SUBJECT and QUESTION TYPE from the question and the marking criteria yourself — do NOT assume it is mathematics.

Question:
${questionText}

${markSchemeBlock}

Adapt the format to the question type:

- CALCULATION / MATHS / NUMERICAL-SCIENCE questions: show EVERY step, briefly explain the reasoning before each major step, and use proper LaTeX maths notation — wrap inline maths in $...$ and displayed equations in $$...$$ (e.g. $x^2$, $\\frac{a}{b}$, $\\binom{6}{2}$, $\\sqrt{16}$, \\pi). Never write maths as plain text. End with the final answer in **bold**.

- ESSAY / EXTENDED-WRITTEN questions (e.g. Theory of Knowledge, History, English Literature, Economics or Business essays, Psychology): give a strong MODEL ANSWER or a detailed answer plan — a clear thesis and line of argument, the key points/paragraphs that earn the marks, specific evidence or examples to use, and the evaluation/judgement the question demands. Reference the marking criteria or markbands where given.

- STRUCTURED / SHORT-ANSWER / DATA questions: give the model answer point by point, matching how the marks are awarded, using correct subject terminology.

General requirements:
1. Make it genuinely educational — the student should learn HOW to produce the answer, not just see it.
2. Structure as markdown with clear headers (### Step 1 / ### Point 1 / ### Paragraph 1, whichever fits); end with the final answer or conclusion in **bold**, and optionally a short "**Why this works**" note.
3. Student-friendly tone: address the student as "you"/"we", be clear and patient. Avoid examiner codes (B1/M1/A1) — that is for marking, not teaching.

OUTPUT FORMAT:
Return ONLY the model answer as plain markdown. Do NOT wrap in JSON. Do NOT include any preamble like "Here is the solution:". Start directly with a one-sentence overview of the approach.`

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

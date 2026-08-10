/**
 * Smoke-test full-solution prompt shape (not a unit test).
 * Run: npx tsx scripts/debug-solution-gen.ts
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { generateGeminiText } from '../lib/ai/gemini-text'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq < 0) continue
  let k = t.slice(0, eq).trim()
  let v = t.slice(eq + 1).trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  if (process.env[k] === undefined) process.env[k] = v
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const id = process.argv[2] || 'b0b7f880-6d67-43b4-b62e-5a8ba75b44cd'
  const { data: attempt } = await sb
    .from('attempts')
    .select('question_text, ocr_text, ai_marking, total_marks')
    .eq('id', id)
    .single()
  if (!attempt) throw new Error('attempt missing')

  const awards = attempt.ai_marking?.marks_awarded || []
  const scheme = awards
    .map(
      (m: { type?: string; line_reference?: string }, i: number) =>
        `- ${m.type || `P${i + 1}`}: ${m.line_reference || ''}`
    )
    .join('\n')

  const prompt = `You write FULL-MARKS exam answers for Cambridge / IB students.

Tone and shape — critical:
- Write as a strong student sitting the real exam: clear, calm, correct.
- Show the answer they would put on the answer booklet / lined paper.
- Use short labels and neat columns where Accounting / Business needs a statement.
- Show brief workings in brackets or under the figures (e.g. 10,000 × $30).
- NO tutor voice ("you should", "remember that", "Step 1: first we…").
- NO examiner codes (M1, A1, B1) and no "why this earns the mark" commentary.
- NO preamble ("Here is the solution").
- Keep it understandable for a 16–18 year old: plain words, correct terms, no waffle.

Question:
${attempt.question_text}

The student already submitted this working (may be incomplete or wrong). Write a CLEAN full-marks version they can learn from — do not copy their mistakes:
"""
${(attempt.ocr_text || '').slice(0, 2000)}
"""

What a full-marks answer must show:
${scheme}

Total marks: ${attempt.total_marks}

Format (markdown only):
- Start with a one-line title like **Marginal costing statement — Option A** (adapt to the question).
- Then the worked answer itself (statement, calculation steps, or short paragraphs).
- End with a single bold line: **Answer: …**

Return ONLY that exam answer as markdown.`

  const solution = await generateGeminiText(prompt, {
    task: 'solution',
    maxOutputTokens: 5000,
    temperature: 0.2,
  })
  console.log(solution)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

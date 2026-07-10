/**
 * Extract an OFFICIAL IB mark scheme PDF into structured JSON for the marking engine.
 *
 *   npx tsx scripts/extract-ib-scheme.ts <markscheme.pdf> <out.json>
 *
 * Output shape (ingested into ib_points_scheme, keyed by paper_ref):
 *   { paper_ref, conventions: { accept, ecf }, questions: [{ question, max_marks, parts: [...] }] }
 *
 * Validation counts mark VALUES, not entries: AG = 0 marks, A2/M2 = 2 marks,
 * the trailing digit of a code is its value (M1=1, A1=1, R1=1). A question is
 * "ok" when the sum of its part mark-values equals max_marks. Only ingest a
 * paper as verified=true when every question is ok.
 */
import { readFile, writeFile } from 'node:fs/promises'
process.env.USE_VERTEX_AI = 'false'
import { GEMINI_PRO_MODEL, generateGeminiWithContents } from '@/lib/ai/gemini-text'

const MS_PATH = process.argv[2]
const OUT = process.argv[3]

const PROMPT = `You are transcribing an OFFICIAL IB Diploma mark scheme into structured JSON for a marking engine. Be faithful and complete — this drives how students are marked.

Extract:
1. The general marking conventions from the "Instructions to Examiners" pages:
   - accept: the rule about accepting equivalent forms / accuracy (verbatim or close).
   - ecf: the follow-through / ECF rule (verbatim or close).
2. EVERY question's mark scheme. For each question give:
   - "question": the question number as a string ("1", "2", ...).
   - "max_marks": the total marks for that whole question (integer).
   - "parts": one entry per sub-part in order. Each part:
       - "part": the label exactly as printed ("(a)", "(a)(i)", "(b)", or "" if the question has no sub-parts).
       - "marks": an ordered array of the individual marks, each { "code": "M1" | "A1" | "R1" | "AG" | "A2" | "M2" | ... } exactly as the scheme awards them (repeat codes as they appear, e.g. two A1s = two entries).
       - "answer": the expected answer/result for that part (concise).
       - "note": any examiner note for that part, or omit if none.
   - If a part shows METHOD 1 / METHOD 2 alternatives, capture the marks for METHOD 1 and put the alternative in "note".

Output ONLY this JSON, no prose, no markdown fences:
{
  "paper_ref": "the paper reference code printed in the header, e.g. N21/5/MATHX/SP1/ENG/TZ0/XX/M",
  "conventions": { "accept": "...", "ecf": "..." },
  "questions": [
    { "question": "1", "max_marks": 5, "parts": [ { "part": "(a)", "marks": [ { "code": "M1" }, { "code": "A1" } ], "answer": "..." } ] }
  ]
}

Rules:
- Capture EVERY question and EVERY part — do not skip or summarise.
- The sum of a question's part mark-VALUES must equal its max_marks (AG awards 0, A2 awards 2, the trailing digit is the value).
- Use the exact IB codes. Keep answers concise.`

/** Value of an IB mark code: trailing digit, or 0 for AG (answer given / no mark). */
function markValue(code: string): number {
  if (!code) return 0
  const c = code.trim().toUpperCase()
  if (c.startsWith('AG')) return 0
  const m = c.match(/(\d+)\s*$/)
  return m ? parseInt(m[1], 10) : 1
}

async function main() {
  if (!MS_PATH || !OUT) {
    console.error('usage: npx tsx scripts/extract-ib-scheme.ts <markscheme.pdf> <out.json>')
    process.exit(1)
  }
  const buf = await readFile(MS_PATH)
  const base64 = buf.toString('base64')
  const t0 = Date.now()
  const res = await generateGeminiWithContents(
    [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64 } },
          { text: PROMPT },
        ],
      },
    ],
    { task: 'pdf-extraction', model: GEMINI_PRO_MODEL, maxOutputTokens: 20000, temperature: 0 }
  )
  const raw = (res.text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const parsed = JSON.parse(raw)
  await writeFile(OUT, JSON.stringify(parsed, null, 2))
  const qs = parsed.questions ?? []
  console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s | paper_ref: ${parsed.paper_ref}`)
  console.log(`questions: ${qs.length}`)
  let allOk = true
  for (const q of qs) {
    const parts = q.parts ?? []
    const sum = parts.reduce(
      (s: number, p: any) => s + (p.marks ?? []).reduce((t: number, m: any) => t + markValue(m.code), 0),
      0
    )
    const ok = sum === q.max_marks
    if (!ok) allOk = false
    console.log(`  Q${q.question} max=${q.max_marks} parts=${parts.length} markvalue=${sum} [${ok ? 'ok' : 'MISMATCH'}]`)
  }
  console.log(`\nwritten: ${OUT}`)
  console.log(allOk ? 'VALIDATION: all questions ok → safe to ingest as verified=true' : 'VALIDATION: mismatches found → review before ingesting')
}
main().catch((e) => { console.error('EXTRACT FAILED:', e?.message || e); process.exit(1) })

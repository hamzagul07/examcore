import { extractJSON } from './json'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('plain object', (extractJSON('{"a":1}') as { a: number }).a === 1)
check(
  'single-quoted keys',
  (extractJSON("{'marks_earned': 3}") as { marks_earned: number }).marks_earned === 3
)
check(
  'skips broken brace group before valid JSON',
  (extractJSON('{broken} and {"valid": true}') as { valid: boolean }).valid === true
)
check(
  'markdown fence',
  (extractJSON('```json\n{"x":1}\n```') as { x: number }).x === 1
)
check(
  'nested braces in string',
  (
    extractJSON('{"note": "Used {x} in working", "marks_earned": 2}') as {
      marks_earned: number
    }
  ).marks_earned === 2
)
check(
  'prefers marking payload over smaller JSON objects',
  (
    extractJSON(
      '{"is_final": true} preamble {"marks_earned": 2, "total_marks": 4, "marks_awarded": [{"type":"M1","earned":true}], "summary": "Good work overall."}'
    ) as { marks_earned: number }
  ).marks_earned === 2
)

// Two defects that together silently discarded a whole paper extraction. Found
// on 9700/42, whose extraction was in fact perfect — 57KB of complete, correct
// JSON describing 40 questions — and which was reported three times over as
// "All extracted questions failed validation".

// LaTeX inside a JSON string. `\%` is not a legal JSON escape, so the document
// failed to parse over one percent sign, and jsonrepair then returned a shape
// without the caller's key rather than an error.
const withLatex =
  '{"paper_marking_type":"point_based","questions":[' +
  '{"question_number":"1(a)","total_marks":1,"mark_scheme":{"marks":[{"description":"$61.5(\\%)$"}]}}' +
  ']}'
const parsedLatex = extractJSON(withLatex) as {
  questions?: { mark_scheme?: { marks?: { description?: string }[] } }[]
}
check('latex escape does not break the parse', parsedLatex?.questions?.length === 1)
check(
  'latex survives intact rather than being stripped',
  parsedLatex?.questions?.[0]?.mark_scheme?.marks?.[0]?.description === '$61.5(\\%)$'
)

// The wrapper must outrank the questions inside it. Each question carries a
// numeric total_marks, which the scorer rewards — so a single question used to
// outscore the document containing all of them, and extractJSON returned one
// question as though it were the whole paper.
const manyQuestions =
  '{"paper_marking_type":"point_based","questions":[' +
  Array.from(
    { length: 12 },
    (_, i) =>
      `{"question_number":"${i + 1}","question_text":"q","total_marks":4,"marking_type":"point_based","mark_scheme":{"marks":[{"type":"B1","value":1}]}}`
  ).join(',') +
  ']}'
const parsedMany = extractJSON(manyQuestions) as { questions?: unknown[] }
check(
  'paper wrapper outranks an individual question',
  Array.isArray(parsedMany?.questions) && parsedMany.questions.length === 12
)


if (failed > 0) {
  process.exit(1)
}
console.log('json.test.ts: all checks passed')

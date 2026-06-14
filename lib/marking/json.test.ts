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

if (failed > 0) {
  process.exit(1)
}
console.log('json.test.ts: all checks passed')

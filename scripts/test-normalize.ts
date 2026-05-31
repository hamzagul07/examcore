import { normalizeMathDelimiters } from '../lib/marking/normalize-math'

const cases: Array<{ name: string; input: string; expected: string }> = [
  {
    name: '1. paren-wrapped inline (nested parens)',
    input: 'You correctly used (\\binom{6}{2}(-4)^2 = 240) for the expansion.',
    expected: 'You correctly used $\\binom{6}{2}(-4)^2 = 240$ for the expansion.',
  },
  {
    name: '2. doubled display equation',
    input: 'Solve: 240=12×80a2$$240 = 12 \\times 80a^2$$',
    expected: 'Solve: $$240 = 12 \\times 80a^2$$',
  },
  {
    name: '3. mixed both bugs',
    input:
      'Using (\\binom{5}{2}(2)^3 a^2 = 80a^2), we get 240=960a2$$240 = 960a^2$$',
    expected:
      'Using $\\binom{5}{2}(2)^3 a^2 = 80a^2$, we get $$240 = 960a^2$$',
  },
  {
    name: '4. false-positive avoidance (non-math parens)',
    input: 'She said (it was great) — make sure your answer is clear.',
    expected: 'She said (it was great) — make sure your answer is clear.',
  },
  {
    name: '5. already correct',
    input: 'We have $x^2 = 4$ so $x = \\pm 2$.',
    expected: 'We have $x^2 = 4$ so $x = \\pm 2$.',
  },
  {
    name: '6. sub-part labels left alone',
    input: 'In part (a) and (b)(i) you scored well; method (M1) was clear.',
    expected: 'In part (a) and (b)(i) you scored well; method (M1) was clear.',
  },
  {
    name: '7. simple inline (x^2)',
    input: 'The value (x^2) should be substituted.',
    expected: 'The value $x^2$ should be substituted.',
  },
]

let pass = 0
let fail = 0
for (const c of cases) {
  const got = normalizeMathDelimiters(c.input)
  const ok = got === c.expected
  if (ok) {
    pass++
    console.log(`PASS ${c.name}`)
  } else {
    fail++
    console.log(`FAIL ${c.name}`)
    console.log(`  input:    ${JSON.stringify(c.input)}`)
    console.log(`  expected: ${JSON.stringify(c.expected)}`)
    console.log(`  got:      ${JSON.stringify(got)}`)
  }
}
console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)

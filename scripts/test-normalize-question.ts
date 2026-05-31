import { normalizeQuestionText } from '../lib/rich-text/normalize-question-text'

const cases: Array<{ name: string; input: string; expected: string }> = [
  {
    name: '1. simple exponent',
    input: 'The coefficient of x^2 in the expansion',
    expected: 'The coefficient of $x^2$ in the expansion',
  },
  {
    name: '2. parenthesized expression to a power',
    input: '(1 - 4x)^6',
    expected: '$(1 - 4x)^6$',
  },
  {
    name: '3. combined',
    input:
      'The coefficient of x^2 in the expansion of (1 - 4x)^6 is 12 times the coefficient of x^2 in (2 + ax)^5',
    expected:
      'The coefficient of $x^2$ in the expansion of $(1 - 4x)^6$ is 12 times the coefficient of $x^2$ in $(2 + ax)^5$',
  },
  {
    name: '4. already-correct (no double-wrap)',
    input: 'The coefficient of $x^2$ in the expansion',
    expected: 'The coefficient of $x^2$ in the expansion',
  },
  {
    name: '5. false positive avoidance (no math)',
    input: 'Show that 5 plus 3 equals 8.',
    expected: 'Show that 5 plus 3 equals 8.',
  },
  {
    name: '6. ambiguous fraction in prose (do not wrap)',
    input: 'The fraction 1/2 of students passed.',
    expected: 'The fraction 1/2 of students passed.',
  },
  {
    name: '7. plain algebraic equation (do not wrap)',
    input: 'Calculate v if v = u + at when t = 5.',
    expected: 'Calculate v if v = u + at when t = 5.',
  },
  // Extra safety checks
  {
    name: '8. braced exponent',
    input: 'expand x^{10} fully',
    expected: 'expand $x^{10}$ fully',
  },
  {
    name: '9. nested exponent inside parenthesised base not double-wrapped',
    input: 'evaluate (x + a^2)^5 here',
    expected: 'evaluate $(x + a^2)^5$ here',
  },
]

let pass = 0
let fail = 0
for (const c of cases) {
  const got = normalizeQuestionText(c.input)
  if (got === c.expected) {
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

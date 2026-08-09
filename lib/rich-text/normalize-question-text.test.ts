import assert from 'node:assert/strict'
import { normalizeQuestionText } from '@/lib/rich-text/normalize-question-text'

function main() {
  assert.equal(
    normalizeQuestionText('y = x^3 - 6x^2 + 9x + 1'),
    '$y = x^3 - 6x^2 + 9x + 1$'
  )
  assert.equal(
    normalizeQuestionText(
      'The curve C has equation y = x^3 - 6x^2 + 9x + 1. Find the maximum.'
    ),
    'The curve C has equation $y = x^3 - 6x^2 + 9x + 1$. Find the maximum.'
  )

  assert.equal(
    normalizeQuestionText('The area is \\frac{1}{2}bh.'),
    'The area is $\\frac{1}{2}bh$.'
  )
  assert.match(normalizeQuestionText('Evaluate \\sqrt{x^2 + 1}.'), /\$\\sqrt/)

  assert.equal(
    normalizeQuestionText('Expand (1 - 4x)^6 up to the term in x^2.'),
    'Expand $(1 - 4x)^6$ up to the term in $x^2$.'
  )

  const prose = [
    'The shop is open 9 am - 5 pm on weekdays.',
    'Distance = speed * time.',
    'The ratio a:b = 2:3.',
  ]
  for (const p of prose) {
    assert.equal(normalizeQuestionText(p), p, `must not wrap: ${p}`)
  }

  // Already-delimited still gets sanitized.
  assert.ok(
    normalizeQuestionText('Solve $\\ce{H2O}$ for x.').includes('\\mathrm{H2O}')
  )

  console.log('normalize-question-text.test.ts: ok')
}

main()

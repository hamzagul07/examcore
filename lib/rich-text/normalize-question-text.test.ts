import assert from 'node:assert/strict'
import { normalizeQuestionText } from '@/lib/rich-text/normalize-question-text'

function main() {
  // A whole equation wraps as ONE run, not per-exponent. This is the fix — the
  // old output was `y = $x^3$ - 6$x^2$ + 9x + 1`, half KaTeX half body font.
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

  // Bare LaTeX commands must not survive as literal backslash text.
  assert.equal(
    normalizeQuestionText('The area is \\frac{1}{2}bh.'),
    'The area is $\\frac{1}{2}bh$.'
  )
  assert.match(normalizeQuestionText('Evaluate \\sqrt{x^2 + 1}.'), /\$\\sqrt/)

  // Parenthesised power and function notation.
  assert.equal(
    normalizeQuestionText('Expand (1 - 4x)^6 up to the term in x^2.'),
    'Expand $(1 - 4x)^6$ up to the term in $x^2$.'
  )
  assert.equal(
    normalizeQuestionText('Given f(x) = 2x^2 + 3, find f(5).'),
    'Given $f(x) = 2x^2 + 3$, find f(5).'
  )
  // An equation with a superscript and equals wraps whole and clean.
  assert.equal(
    normalizeQuestionText('Solve 3x^2 - 12x + 9 = 0 for x.'),
    'Solve $3x^2 - 12x + 9 = 0$ for x.'
  )

  // Prose that merely contains an operator or digits must be left ALONE — the
  // false positive that corrupts wording is the thing to avoid.
  const prose = [
    'The shop is open 9 am - 5 pm on weekdays.',
    'Choose between plan A and plan B.',
    'She scored 8 out of 10 in the test.',
    'Water and oil do not mix.',
    'Explain why the reaction is exothermic.',
    // Regression: unanchored single-letter atoms let a run open on the last
    // letter of one word and close on the first of the next, so `word = word`
    // used to become `Distanc$e = s$peed`. A letter (or ratio colon) touching
    // the match now vetoes the wrap.
    'Distance = speed * time.',
    'Pressure = force / area.',
    'The reaction N2 + 3H2 = 2NH3 is exothermic.', // used to emit `$$`
    'Balance: 2H2 + O2 = 2H2O',
    'Volume = 25 cm^3 of gas.', // used to split "Volume" and "cm"
    'The concentration was 0.5 mol/dm^3.',
    'The pH = 7 at neutral.', // used to split "pH"
    'The ratio a:b = 2:3.', // ratio colon, not an equation
  ]
  for (const p of prose) {
    assert.equal(normalizeQuestionText(p), p, `must not wrap: ${p}`)
  }

  // Already-delimited input is trusted and left untouched (beyond tables).
  assert.equal(
    normalizeQuestionText('Solve $x^2 = 4$ for x.'),
    'Solve $x^2 = 4$ for x.'
  )

  // A lone function call with no power/latex renders identically as text, so we
  // leave it plain rather than risk wrapping prose.
  assert.equal(normalizeQuestionText('Find the value of f(5).'), 'Find the value of f(5).')

  console.log('normalize-question-text.test.ts: ok')
}

main()

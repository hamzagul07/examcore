import assert from 'node:assert/strict'
import { normalizeCourseText } from './normalize-course-text'

const kineticQuestion =
  'Show that the equation for kinetic energy, E_k = \\frac{1}{2}mv², is dimensionally homogeneous.'

const normalized = normalizeCourseText(kineticQuestion)
assert.ok(!normalized.startsWith('$'), 'prose question must not be fully math-wrapped')
assert.ok(normalized.includes('Show that the equation'), 'prose words keep spaces')
assert.match(normalized, /\$E_k = \\frac\{1\}\{2\}mv²\$/, 'equation fragment is math-wrapped')

const standalone = normalizeCourseText('Q = mc\\Delta T')
assert.match(standalone, /\$Q = mc\\Delta T\$/, 'standalone latex equation wraps')

const convertLine = normalizeCourseText('Convert 2.5 \\textmu s to seconds (s).')
assert.ok(convertLine.includes('Convert 2.5'), 'convert prose stays readable')

const backticks = normalizeCourseText(
  'Given `\\frac{dy}{dx} = \\frac{y+1}{x^2}` for `x > 0`, find `y`.'
)
assert.ok(backticks.includes('$\\frac{dy}{dx}'), 'backtick latex becomes math')
assert.ok(backticks.includes('$x > 0$'), 'backtick inequality becomes math')
assert.ok(!backticks.includes('`'), 'backticks removed from math segments')

console.log('normalize-course-text.test.ts: ok')

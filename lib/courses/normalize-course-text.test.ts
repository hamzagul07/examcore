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

// `\[...\]` / `\(...\)` LaTeX delimiters convert to `$$...$$` / `$...$`.
const disp = normalizeCourseText('Integrate: \\[ \\int x^2\\,dx = \\frac{x^3}{3} + C \\]')
assert.match(disp, /\$\$\s*\\int x\^2/, `\\[...\\] → $$: ${disp}`)
assert.ok(!disp.includes('\\['), `no raw \\[: ${disp}`)
const inl = normalizeCourseText('For the work \\(W = -p\\Delta V\\) done on the gas.')
assert.ok(inl.includes('$W = -p\\Delta V$'), `\\(...\\) → $: ${inl}`)

// Currency dollars do not open math mode and swallow the sentence: the pair
// around the prose is escaped (`\$`) so remark-math never treats it as math.
const money = normalizeCourseText('Overheads are $120,000 / 6,000 hours = $20 per unit.')
assert.ok(money.includes('hours'), `prose kept: ${money}`)
assert.ok(money.includes('\\$120,000') && money.includes('\\$20'), `currency escaped: ${money}`)

// Uppercase variable equations (PED, HCl) are math, not prose — they wrap.
const ped = normalizeCourseText('PED = \\frac{\\%\\Delta Q_d}{\\%\\Delta P}')
assert.ok(ped.trim().startsWith('$') && ped.trim().endsWith('$'), `PED wrapped: ${ped}`)

// Bare multi-row formula (`\\` row breaks, no `$`) becomes a display block.
const rows = normalizeCourseText('\\text{a: } x = 1 \\\\ \\text{b: } y = 2')
assert.ok(rows.includes('$$'), `multi-row → display: ${rows}`)

// A formula field with trailing PROSE must not have the prose swallowed into a
// display block; promotion only fires for pure formulas.
const mixed = normalizeCourseText(
  '\\Delta H = 1 \\text{ kJ} \\\\ \\Delta S = 2\n\nThis means the reaction proceeds forward.'
)
assert.ok(!mixed.startsWith('$$'), `prose not display-wrapped: ${mixed}`)
assert.ok(
  mixed.includes('This means the reaction proceeds forward.'),
  `prose preserved: ${mixed}`
)

// Backtick code (`^Ptr`, `\\n`) is not mis-wrapped as broken math.
const code = normalizeCourseText('Defined with `^List`, ending in `\\n`.')
assert.ok(!code.includes('$^List$') && !code.includes('$\\n$'), `code not math: ${code}`)

console.log('normalize-course-text.test.ts: ok')

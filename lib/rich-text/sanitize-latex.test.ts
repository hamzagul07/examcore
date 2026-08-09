import assert from 'node:assert/strict'
import katex from 'katex'
import {
  fixDoubleEscapedLatexCommands,
  promoteBareBeginEnvironments,
  replaceCommandWithBraces,
  sanitizeLatexFragment,
  sanitizeMathDelimitersInText,
} from './sanitize-latex'

assert.equal(sanitizeLatexFragment('\\ce{H2O}'), '\\mathrm{H2O}')
assert.equal(
  replaceCommandWithBraces('\\ce{H2SO4^{+}}', 'ce', (i) => `\\mathrm{${i}}`),
  '\\mathrm{H2SO4^{+}}'
)
assert.equal(sanitizeLatexFragment('\\overbar{x}'), '\\overline{x}')
assert.ok(sanitizeLatexFragment('85%').includes('\\%'))
assert.ok(sanitizeLatexFragment('x²').includes('^{2}'))

// Over-escaped JSON: string contains two backslashes before "frac".
const doubled = '\\\\frac{1}{2}'
assert.equal(fixDoubleEscapedLatexCommands(doubled), '\\frac{1}{2}')
assert.equal(
  sanitizeLatexFragment(doubled),
  '\\frac{1}{2}'
)

const mixed = sanitizeMathDelimitersInText(
  'Got $\\ce{CO2}$ and $\\pu{2 mol}$ left'
)
assert.ok(mixed.includes('\\mathrm{CO2}'))
assert.ok(mixed.includes('\\text{2 mol}'))

const bare = promoteBareBeginEnvironments(
  'See\n\\begin{aligned} x&=1 \\\\ y&=2 \\end{aligned}\nhere'
)
assert.ok(bare.includes('$$'), bare)
assert.ok(bare.includes('\\begin{aligned}'), bare)

for (const frag of [
  '\\mathrm{H2O}',
  '\\mathrm{H2SO4^{+}}',
  'x^{2} + 1',
  '\\overline{x}',
  '85\\%',
  '\\frac{1}{2}',
]) {
  katex.renderToString(frag, { throwOnError: true, strict: 'ignore' })
}

console.log('sanitize-latex.test.ts: ok')

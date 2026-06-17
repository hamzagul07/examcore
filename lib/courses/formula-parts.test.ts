import assert from 'node:assert/strict'
import { extractLatexSymbols, extractLatexEquations, parseFormulaParts } from './formula-parts'

type Case = { latex: string; expected: string[] }

const CASES: Case[] = [
  { latex: 'p = mv', expected: ['p', 'm', 'v'] },
  { latex: 'F = \\frac{\\Delta p}{\\Delta t}', expected: ['F', 'Δp', 'Δt'] },
  { latex: 'Q = mc\\Delta T', expected: ['Q', 'm', 'c', 'ΔT'] },
  { latex: 'Q = mL', expected: ['Q', 'm', 'L'] },
  { latex: 'v = f\\lambda', expected: ['v', 'f', 'λ'] },
  { latex: 'T = \\frac{1}{f}', expected: ['T', 'f'] },
  { latex: 'I = I_0 \\cos^2\\theta', expected: ['I', 'I₀', 'θ'] },
  { latex: 'p_f = p_i', expected: ['p_f', 'p_i'] },
  { latex: 'F_{net} = ma', expected: ['F_net', 'm', 'a'] },
  { latex: 'p_f = p_i + Ft', expected: ['p_f', 'p_i', 'F', 't'] },
]

let failed = 0

for (const { latex, expected } of CASES) {
  const got = extractLatexSymbols(latex)
  const ok =
    got.length === expected.length &&
    expected.every((s) => got.includes(s)) &&
    got.every((s) => expected.includes(s))
  if (!ok) {
    failed++
    console.error(`FAIL extract: ${latex}`)
    console.error(`  expected: ${expected.join(', ')}`)
    console.error(`  got:      ${got.join(', ')}`)
  }
}

const pMv = parseFormulaParts('$p = mv$')
assert.equal(pMv.parts.map((p) => p.symbol).join(','), 'p,m,v', 'p=mv buttons')
assert.equal(
  pMv.parts.find((p) => p.symbol === 'v')?.meaning,
  'velocity, in m s⁻¹',
  'v meaning must be per-variable'
)

const fNet = parseFormulaParts(
  '$$F_{net} = ma$$\n$$F_{net} = \\frac{\\Delta p}{\\Delta t}$$'
)
assert.equal(fNet.expressions.length, 2, 'two display equations')
assert.equal(
  fNet.parts.map((p) => p.symbol).join(','),
  'F_net,m,a,Δp,Δt',
  'F_net multi-equation buttons'
)

const brContent =
  '$$F_{net} = ma$$ <br> $$F_{net} = \\frac{\\Delta p}{\\Delta t}$$'
const fromBr = extractLatexEquations(brContent)
assert.equal(fromBr.length, 2, 'br splits to two equations')
assert.ok(!fromBr.join('').includes('br'), 'no br token in latex')

const kelvin = parseFormulaParts('$K = C + 273.15$', {
  topicCode: '14.2',
  slug: '14-2-temperature-scales',
  title: 'Temperature scales',
  paper: 'P4',
  paperName: 'P4',
  status: 'premium',
  summary: '',
  durationMin: 20,
  sections: [],
})
assert.equal(
  kelvin.parts.find((p) => p.symbol === 'K')?.meaning,
  'absolute temperature, in Kelvin (K)',
  'K uses thermal area definition'
)
assert.equal(
  kelvin.parts.find((p) => p.symbol === 'C')?.meaning,
  'Celsius temperature, in degrees Celsius (°C)',
  'C uses thermal area definition'
)

const unclosed = parseFormulaParts(
  'Gradient of Normal: $m_{\\text{normal}} = -\\frac{1}{m_{\\text{tangent}}}'
)
assert.equal(unclosed.description, 'Gradient of Normal', 'label prose separated from math')
assert.equal(unclosed.expressions.length, 1, 'one equation from unclosed delimiter')
assert.ok(
  unclosed.expressions[0].includes('m_{\\text{normal}}'),
  'expression is valid inline math'
)
assert.ok(
  unclosed.parts.some((p) => p.symbol === 'm_normal'),
  'text subscript parsed as m_normal'
)

const proseFormula = parseFormulaParts(
  'If $y = ax^n$, then its derivative is $\\frac{dy}{dx} = anx^{n-1}$'
)
assert.equal(proseFormula.expressions.length, 2, 'two inline equations from prose line')
assert.ok(!proseFormula.expressions[0].includes('If '), 'no prose inside math wrap')

const proseOnly = parseFormulaParts(
  'For example, the unit for force, the Newton (N), is equivalent to kg m s⁻².'
)
assert.equal(proseOnly.expressions.length, 0, 'prose-only formula has no KaTeX expression')
assert.ok(proseOnly.description.includes('Newton'), 'prose stays in description')

const eK = parseFormulaParts('$E_k = \\frac{1}{2}mv^2$', {
  topicCode: '1.1',
  slug: '1-1-physical-quantities',
  title: 'Physical quantities',
  paper: 'P2',
  paperName: 'P2',
  status: 'premium',
  summary: '',
  durationMin: 20,
  sections: [],
})
assert.equal(
  eK.parts.find((p) => p.symbol === 'E_k')?.meaning,
  'kinetic energy, in joules (J)',
  'E_k has definition'
)
assert.equal(
  eK.parts.find((p) => p.symbol === 'm')?.meaning,
  'metre (m), SI base unit of length',
  'm uses SI-units topic override'
)

const newton = parseFormulaParts('$N = kg m s^{-2}$', {
  topicCode: '1.2',
  slug: '1-2-si-units',
  title: 'SI units',
  paper: 'P2',
  paperName: 'P2',
  status: 'premium',
  summary: '',
  durationMin: 20,
  sections: [],
})
assert.equal(
  newton.parts.find((p) => p.symbol === 'N')?.meaning,
  'newton (N), the SI unit of force',
  'N has definition'
)

const businessLesson = {
  topicCode: '5.4.4',
  slug: '5-4-4-break-even-analysis',
  title: 'Break-even analysis',
  paper: 'AS',
  paperName: 'AS',
  status: 'premium' as const,
  summary: '',
  durationMin: 28,
  sections: [],
}

const breakEven = parseFormulaParts(
  'Break-even output (units) = $\\frac{\\text{Fixed costs}}{\\text{Contribution per unit}}$',
  businessLesson,
  '9609'
)
assert.ok(
  breakEven.parts.some(
    (p) => p.meaning.includes('Fixed costs') || p.symbol.toLowerCase().includes('fixed')
  ),
  'break-even includes Fixed costs definition'
)
assert.ok(
  breakEven.parts.some((p) => p.meaning.includes('contribution') || p.meaning.includes('Contribution')),
  'break-even includes contribution definition'
)
assert.ok(
  !breakEven.parts.some((p) => p.meaning === 'Definition coming soon'),
  'no placeholder defs on break-even formula'
)

const roce = parseFormulaParts(
  '$$\\text{ROCE} = \\frac{\\text{PBIT}}{\\text{Capital employed}} \\times 100$$',
  { ...businessLesson, topicCode: '5.3.1' },
  '9706'
)
assert.ok(
  roce.parts.some((p) => p.meaning.toLowerCase().includes('capital employed') || p.symbol === 'CE'),
  'ROCE formula defines capital employed'
)
assert.ok(
  !roce.parts.some((p) => p.meaning === 'Definition coming soon'),
  'no placeholder defs on ROCE formula'
)

if (failed > 0) {
  console.error(`\n${failed} extract test(s) failed`)
  process.exit(1)
}

console.log(`All ${CASES.length} extract cases + parse smoke checks passed.`)

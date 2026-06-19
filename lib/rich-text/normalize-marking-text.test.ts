import assert from 'node:assert/strict'
import { normalizeMarkingText, isRealMath } from './normalize-marking-text'

// LaTeX-command spans are real math (previously downgraded to plain text)
assert.ok(isRealMath('\\theta'), 'theta is math')
assert.ok(isRealMath('\\sin x'), 'sin x is math')
assert.ok(isRealMath('\\pi r^2'), 'pi r^2 is math')
assert.ok(isRealMath('x^2 = 4'), 'algebraic is math')
// Currency is NOT math
assert.ok(!isRealMath('152{,}000'), 'plain currency is not math')
assert.ok(!isRealMath('\\$40'), 'escaped dollar is not math')

// $\theta$ stays as KaTeX math (delimiters preserved), not stripped to plain
const t1 = normalizeMarkingText('M1 for $\\theta$ in radians')
assert.ok(t1.includes('$\\theta$'), `theta preserved as math: ${t1}`)

// \[...\] display math becomes $$...$$
const t2 = normalizeMarkingText('Result: \\[ x^2 + 2x \\]')
assert.ok(t2.includes('$$x^2 + 2x$$') || t2.includes('$$ x^2 + 2x $$'), `display math: ${t2}`)

// \(...\) inline math
const t3 = normalizeMarkingText('A1 for \\(\\frac{dy}{dx} = 3x^2\\)')
assert.ok(t3.includes('\\frac{dy}{dx}'), `inline paren math: ${t3}`)

// Currency $...$ is rendered plain, never opens math mode
const t4 = normalizeMarkingText('Cost was $152{,}000$ total')
assert.ok(!/\$\d/.test(t4.replace(/\\\$/g, '')) || t4.includes('152,000'), `currency plain: ${t4}`)

console.log('normalize-marking-text.test.ts: ok')

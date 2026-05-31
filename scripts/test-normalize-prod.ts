import { normalizeMathDelimiters } from '../lib/marking/normalize-math'

// Real, already-correct summaries pulled from the production DB.
// The normalizer MUST leave these UNCHANGED (idempotent, no false positives).
const realCorrect: string[] = [
  "You correctly used $\\binom{6}{2}(-4)^2 = 240$ for the first expansion and $\\binom{5}{2}(2)^3 a^2 = 80a^2$ for the second. You needed to write $$240 = 12 \\times 80a^2$$ then solve: $$240 = 960a^2 \\implies a^2 = \\frac{240}{960} = \\frac{1}{4} \\implies a = \\frac{1}{2}$$",
  "your direct material figures $(166{,}600) + (60{,}000) + (76{,}000) = 302{,}600$ don't reconcile with the contribution of $166{,}600 + 52{,}000 = 218{,}600$ given the sales values shown.",
  "including $\\pm\\frac{1}{2}$ does not cost you any marks here.",
  "the original expression is $\\frac{4}{px}$, which gives $x^{-r}$, making the total power of $x$ equal to $10 - 2r - r = 10 - 3r$.",
  "your expansion of $(-4-2x)^2 = 16 + 16x + 4x^2$ was correct",
]

// Synthesised broken versions of the real production bug (paren-wrapped),
// to confirm the normalizer repairs them.
const brokenToFixed: Array<{ input: string; expected: string }> = [
  {
    input:
      'You correctly used (\\binom{6}{2}(-4)^2 = 240) for the first expansion and (\\binom{5}{2}(2)^3 a^2 = 80a^2) for the second.',
    expected:
      'You correctly used $\\binom{6}{2}(-4)^2 = 240$ for the first expansion and $\\binom{5}{2}(2)^3 a^2 = 80a^2$ for the second.',
  },
]

let fail = 0

for (const s of realCorrect) {
  const got = normalizeMathDelimiters(s)
  if (got !== s) {
    fail++
    console.log('FALSE POSITIVE — normalizer changed already-correct text:')
    console.log('  before:', JSON.stringify(s))
    console.log('  after: ', JSON.stringify(got))
  } else {
    console.log('UNCHANGED (good):', s.slice(0, 60), '…')
  }
}

for (const c of brokenToFixed) {
  const got = normalizeMathDelimiters(c.input)
  if (got !== c.expected) {
    fail++
    console.log('FIX FAILED:')
    console.log('  expected:', JSON.stringify(c.expected))
    console.log('  got:     ', JSON.stringify(got))
  } else {
    console.log('FIXED (good):', c.input.slice(0, 50), '…')
  }
}

console.log(`\n${fail === 0 ? 'ALL OK' : fail + ' PROBLEM(S)'}`)
if (fail > 0) process.exit(1)

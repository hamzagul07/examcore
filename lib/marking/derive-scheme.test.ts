import assert from 'node:assert/strict'
import { parseDerivedScheme, buildDeriveSchemePrompt } from './derive-scheme'

// --- Known total wins as the denominator, even if the model's total disagrees ---
{
  const raw = {
    expected_answer: 'y = 4x - 4',
    total_marks: 4, // model said 4
    marks: [
      { code: 'M1', marks: 1, description: 'differentiate' },
      { code: 'A1', marks: 1, description: 'gradient = 4' },
      { code: 'M1', marks: 1, description: 'point-slope' },
      { code: 'A1', marks: 1, description: 'equation' },
      { code: 'A1', marks: 1, description: 'simplified' },
    ],
  }
  const out = parseDerivedScheme(raw, 5) // question says [5]
  assert.ok(out, 'parsed')
  assert.equal(out!.total, 5, 'known total (5) wins over model total (4)')
  assert.equal(out!.scheme.marks.length, 5, 'all mark points kept')
}

// --- No known total: fall back to the model total ---
{
  const out = parseDerivedScheme(
    { total_marks: 6, marks: [{ code: 'M1', marks: 3, description: 'x' }] },
    null
  )
  assert.equal(out!.total, 6, 'model total used when no known total')
}

// --- No total anywhere: fall back to the sum of mark points ---
{
  const out = parseDerivedScheme(
    {
      marks: [
        { code: 'M1', marks: 1, description: 'a' },
        { code: 'A1', marks: 2, description: 'b' },
      ],
    },
    null
  )
  assert.equal(out!.total, 3, 'sum of mark points (1+2) as last resort')
}

// --- Empty / malformed → null so the caller falls back to single-pass ---
assert.equal(parseDerivedScheme({ marks: [] }, 5), null, 'no marks → null')
assert.equal(parseDerivedScheme('nonsense', 5), null, 'non-object → null')
assert.equal(parseDerivedScheme(null, 5), null, 'null → null')

// --- Prompt reflects a known total vs. "read it from the question" ---
{
  const withTotal = buildDeriveSchemePrompt({
    subjectName: 'Mathematics: Analysis and Approaches',
    board: 'IB Diploma',
    questionText: 'Find the tangent to y=x^2 at x=2. [5]',
    totalMarks: 5,
    mathConventions: true,
  })
  assert.ok(withTotal.includes('EXACTLY 5 marks'), 'known total stated in prompt')
  assert.ok(withTotal.includes('M marks for a valid METHOD'), 'math conventions included')

  const noTotal = buildDeriveSchemePrompt({
    subjectName: 'Biology',
    board: 'IB Diploma',
    questionText: 'Explain osmosis.',
    totalMarks: null,
    mathConventions: false,
  })
  assert.ok(noTotal.includes('Read the total marks from the question'), 'infer-total instruction')
}

console.log('derive-scheme: all assertions passed')

import assert from 'node:assert/strict'
import { buildMarkGap, inlineGhostFixes } from './mark-gap'
import type { MarkAwarded } from './types'

function mark(over: Partial<MarkAwarded>): MarkAwarded {
  return { mark_id: 1, type: 'M1', earned: true, reasoning: '', ...over }
}

// --- only missed marks become gap items; earned marks are excluded ---
{
  const gap = buildMarkGap(
    {
      marks_awarded: [
        mark({ mark_id: 1, type: 'M1', earned: true }),
        mark({ mark_id: 2, type: 'A1', earned: false, reasoning: 'No unit.' }),
      ],
    },
    3,
    4
  )
  assert.equal(gap.earned, 3)
  assert.equal(gap.total, 4)
  assert.equal(gap.items.length, 1)
  assert.equal(gap.items[0].type, 'A1')
  assert.equal(gap.items[0].reasoning, 'No unit.')
}

// --- annotations pair to marks by their code, regardless of order ---
{
  const gap = buildMarkGap(
    {
      marks_awarded: [
        mark({ mark_id: 1, type: 'B1', earned: false }),
        mark({ mark_id: 2, type: 'A1', earned: false }),
      ],
      full_marks_rewrite: {
        rewritten_answer: '…',
        annotations: [
          { text: 'Add the unit N.', earns: 'the A1 accuracy mark' },
          { text: 'State the direction.', earns: '(B1)' },
        ],
      },
    },
    2,
    4
  )
  const a1 = gap.items.find((i) => i.type === 'A1')
  const b1 = gap.items.find((i) => i.type === 'B1')
  assert.equal(a1?.fix, 'Add the unit N.')
  assert.equal(a1?.earns, 'the A1 accuracy mark')
  assert.equal(b1?.fix, 'State the direction.')
}

// --- unmatched annotations pair by order as a fallback ---
{
  const gap = buildMarkGap(
    {
      marks_awarded: [mark({ mark_id: 1, type: 'M2', earned: false })],
      full_marks_rewrite: {
        rewritten_answer: '…',
        annotations: [{ text: 'Show the substitution.', earns: '+1 mark' }],
      },
    },
    5,
    6
  )
  assert.equal(gap.items[0].fix, 'Show the substitution.')
  assert.equal(gap.items[0].earns, '+1 mark')
}

// --- no rewrite: gap still lists missed marks, fix stays null (free tier) ---
{
  const gap = buildMarkGap(
    { marks_awarded: [mark({ mark_id: 1, type: 'A1', earned: false, reasoning: 'Wrong sign.' })] },
    5,
    6
  )
  assert.equal(gap.items[0].fix, null)
  assert.equal(gap.items[0].earns, null)
  assert.equal(gap.items[0].reasoning, 'Wrong sign.')
}

// --- inline fixes need BOTH an anchor snippet and a fix; others fall to panel ---
{
  const gap = buildMarkGap(
    {
      marks_awarded: [
        mark({ mark_id: 1, type: 'A1', earned: false, line_reference: 'F = 6.0' }),
        mark({ mark_id: 2, type: 'B1', earned: false, line_reference: null }),
      ],
      full_marks_rewrite: {
        rewritten_answer: '…',
        annotations: [
          { text: 'Write F = 6.0 N.', earns: 'A1' },
          { text: 'State the direction.', earns: 'B1' },
        ],
      },
    },
    2,
    4
  )
  const inline = inlineGhostFixes(gap)
  assert.equal(inline['A1'].text, 'Write F = 6.0 N.')
  assert.equal(inline['A1'].earns, 'A1')
  assert.equal('B1' in inline, false) // no anchor snippet → panel only
}

console.log('mark-gap.test.ts: all assertions passed')

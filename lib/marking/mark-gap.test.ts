import assert from 'node:assert/strict'
import { buildBandGap, buildCriteriaGap, buildMarkGap, inlineGhostFixes } from './mark-gap'
import type { IbCriterionResult, LorBandResult, MarkAwarded } from './types'
import type { RubricBand } from './mark-scheme-display'

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

// --- band gap: ladder marks current + next, lift hint prefers band annotation ---
{
  const bands: RubricBand[] = [
    { level: 1, marks_min: 1, marks_max: 2, descriptor: 'Basic, descriptive.' },
    { level: 2, marks_min: 3, marks_max: 4, descriptor: 'Developed explanation.' },
    { level: 3, marks_min: 5, marks_max: 6, descriptor: 'Reasoned analysis.' },
  ]
  const bandResult: LorBandResult = {
    level: 2,
    marks_awarded: 3,
    marks_available: 6,
    band_descriptor: 'Developed explanation.',
    justification: 'Explains both sides but does not weigh them.',
    improvements: ['Commit to a judgement.'],
  }
  const gap = buildBandGap(bandResult, bands, {
    annotations: [{ text: 'End with a supported conclusion.', earns: 'lifts to Level 3' }],
  })
  // ladder is highest-level first
  assert.deepEqual(
    gap.ladder.map((r) => r.level),
    [3, 2, 1]
  )
  assert.equal(gap.ladder.find((r) => r.level === 2)?.state, 'current')
  assert.equal(gap.next?.level, 3)
  // band-naming annotation wins over the examiner improvement
  assert.equal(gap.liftHint, 'End with a supported conclusion.')
}

// --- band gap degrades: no rubric → empty ladder, hint falls to improvement ---
{
  const gap = buildBandGap(
    {
      level: 4,
      marks_awarded: 8,
      marks_available: 15,
      band_descriptor: '',
      justification: '',
      improvements: ['Add a counter-argument.'],
    },
    null
  )
  assert.equal(gap.ladder.length, 0)
  assert.equal(gap.next, null)
  assert.equal(gap.liftHint, 'Add a counter-argument.')
}

// --- criteria gap: totals, most-lost-first ordering, lift from improvements ---
{
  const criteria: IbCriterionResult[] = [
    {
      criterion: 'A',
      criterion_name: 'Focus and method',
      level: 3,
      marks_awarded: 5,
      marks_available: 6,
      band_descriptor: '…',
      justification: '…',
      improvements: ['Sharpen the research question.'],
    },
    {
      criterion: 'B',
      criterion_name: 'Knowledge',
      level: 1,
      marks_awarded: 2,
      marks_available: 6,
      band_descriptor: '…',
      justification: '…',
      improvements: ['Engage the academic sources directly.'],
    },
    {
      criterion: 'C',
      criterion_name: 'Discussion',
      level: 4,
      marks_awarded: 4,
      marks_available: 4,
      band_descriptor: '…',
      justification: '…',
    },
  ]
  const gap = buildCriteriaGap(criteria)
  assert.equal(gap.totalAwarded, 11)
  assert.equal(gap.totalAvailable, 16)
  assert.equal(gap.totalLost, 5)
  // C lost nothing → excluded; B (lost 4) ranks above A (lost 1)
  assert.deepEqual(
    gap.gaps.map((g) => g.criterion),
    ['B', 'A']
  )
  assert.equal(gap.gaps[0].lost, 4)
  assert.equal(gap.gaps[0].lift, 'Engage the academic sources directly.')
  assert.equal(gap.gaps.find((g) => g.criterion === 'C'), undefined)
}

console.log('mark-gap.test.ts: all assertions passed')

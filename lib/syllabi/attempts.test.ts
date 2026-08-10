import assert from 'node:assert/strict'
import { getAttemptSubjectCode, type AttemptWithPaper } from '@/lib/syllabi/attempts'

const preferred = ['9709', '9708', '9706'] as const

function attempt(partial: Partial<AttemptWithPaper> & Pick<AttemptWithPaper, 'marks_earned' | 'total_marks'>): AttemptWithPaper {
  return {
    id: 't',
    created_at: '2026-01-01T00:00:00Z',
    syllabus_tags: null,
    mark_schemes: null,
    ...partial,
  }
}

assert.equal(
  getAttemptSubjectCode(
    attempt({
      marks_earned: 14,
      total_marks: 20,
      syllabus_tags: ['1.1'],
      ocr_text:
        'Explain the basic economic problem of scarcity and opportunity cost for a firm.',
    }),
    preferred
  ),
  '9708'
)

assert.equal(
  getAttemptSubjectCode(
    attempt({
      marks_earned: 6,
      total_marks: 8,
      syllabus_tags: ['1.1'],
      question_text: 'Solve by completing the square: x^2 + 6x + 5 = 0',
    }),
    preferred
  ),
  '9709'
)

assert.equal(
  getAttemptSubjectCode(
    attempt({
      marks_earned: 10,
      total_marks: 12,
      syllabus_tags: ['1.1.1'],
      ocr_text: 'Prepare a bank reconciliation statement from the following ledger.',
    }),
    preferred
  ),
  '9706'
)

assert.equal(
  getAttemptSubjectCode(
    attempt({
      marks_earned: 8,
      total_marks: 10,
      syllabus_tags: ['1.3.2'],
      ocr_text: 'Calculate the depreciation of non-current assets for the year.',
    }),
    preferred
  ),
  '9706'
)

assert.equal(
  getAttemptSubjectCode(
    attempt({
      marks_earned: 12,
      total_marks: 20,
      syllabus_tags: ['7.3'],
      question_text:
        'Assess whether product differentiation always raises consumer surplus in an oligopoly.',
    }),
    preferred
  ),
  '9708'
)

assert.equal(
  getAttemptSubjectCode(
    attempt({
      marks_earned: 5,
      total_marks: 10,
      syllabus_tags: ['1.1'],
      ocr_text: 'scarcity and opportunity cost',
      mark_schemes: { paper_code: '9709/12' },
    }),
    preferred
  ),
  '9709'
)

assert.equal(
  getAttemptSubjectCode(
    attempt({
      marks_earned: 7,
      total_marks: 10,
      syllabus_tags: ['1.1'],
      ocr_text: 'scarcity and opportunity cost',
    }),
    ['9709']
  ),
  '9709'
)

console.log('attempts.test.ts: ok')

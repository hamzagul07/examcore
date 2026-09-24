import assert from 'node:assert/strict'
import test from 'node:test'

import { buildQuestionSlug, parseQuestionSlug } from '@/lib/seo/question-slug'

test('buildQuestionSlug ↔ parseQuestionSlug roundtrip', () => {
  const slug = buildQuestionSlug('9709/32', 'October/November 2024', '11(b)')
  assert.equal(slug, '9709-32-october-november-2024-q11b')
  const parsed = parseQuestionSlug(slug)
  assert.deepEqual(parsed, {
    paperCode: '9709/32',
    paperSession: 'October/November 2024',
    questionNumberNorm: '11b',
  })
})

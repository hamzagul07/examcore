import assert from 'node:assert/strict'
import {
  normalizeQuestionForFingerprint,
  schemeFingerprint,
} from './scheme-fingerprint'

const stem = `Omira and Peter were in partnership.
  Prepare the realisation account.`

{
  const a = schemeFingerprint({
    questionText: stem,
    totalMarks: 18,
    subjectCode: '9706',
    board: 'Cambridge International',
  })
  const b = schemeFingerprint({
    questionText: `  ${stem.replace(/\n/g, '\n\n')}  `,
    totalMarks: 18,
    subjectCode: '9706',
    board: 'Cambridge International',
  })
  assert.equal(a, b, 'whitespace / case-insensitive normalize → same fingerprint')
}

{
  const at9 = schemeFingerprint({
    questionText: stem,
    totalMarks: 9,
    subjectCode: '9706',
  })
  const at18 = schemeFingerprint({
    questionText: stem,
    totalMarks: 18,
    subjectCode: '9706',
  })
  assert.notEqual(at9, at18, 'different totals never collide')
}

{
  const math = schemeFingerprint({
    questionText: stem,
    totalMarks: 18,
    subjectCode: '9709',
  })
  const acc = schemeFingerprint({
    questionText: stem,
    totalMarks: 18,
    subjectCode: '9706',
  })
  assert.notEqual(math, acc, 'subject code is part of the key')
}

{
  const n = normalizeQuestionForFingerprint('Hello\u00ad\u200b World')
  assert.equal(n, 'hello world', 'strips soft hyphen / zero-width')
}

console.log('scheme-fingerprint: all assertions passed')

import assert from 'node:assert/strict'
import {
  detectPaperKind,
  paperNumberFromComponent,
  parseMarkSchemePath,
  parseQuestionPaperPath,
  questionPaperPathFromMarkScheme,
} from './paper-meta'

const p3 = parseQuestionPaperPath('cambridge/9702/s24/qp_32.pdf')
assert.equal(p3?.paperNumber, '3')
assert.equal(p3?.variant, '32')
assert.equal(p3?.paperKind, 'practical')

const p1 = parseQuestionPaperPath('cambridge/9702/s24/qp_12.pdf')
assert.equal(p1?.paperKind, 'mcq')

assert.equal(paperNumberFromComponent('42'), '4')
assert.equal(paperNumberFromComponent('32'), '3')
assert.equal(detectPaperKind('37'), 'practical')

const ms = parseMarkSchemePath('cambridge/9702/s24/ms_42.pdf')
assert.equal(ms?.paperNumber, '4')
assert.equal(ms?.variant, '42')
assert.equal(ms?.pdfKind, 'mark-scheme')
assert.equal(
  questionPaperPathFromMarkScheme('cambridge/9702/s24/ms_42.pdf'),
  'cambridge/9702/s24/qp_42.pdf'
)

console.log('paper-meta.test.ts: ok')

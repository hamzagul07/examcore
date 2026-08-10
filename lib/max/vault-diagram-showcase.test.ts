import assert from 'node:assert/strict'
import {
  buildVaultDiagramTheatre,
  buildVaultDiagramTheatres,
} from '@/lib/max/vault-diagram-showcase'

const maths = buildVaultDiagramTheatre('9709', 'Mathematics')
assert.ok(maths)
assert.equal(maths!.subjectLabel, 'Mathematics')
assert.ok(maths!.signature)
assert.ok((maths!.signature!.teachingSteps?.length ?? 0) >= 3)

const many = buildVaultDiagramTheatres([
  { code: '9709', name: 'Mathematics' },
  { code: '9702', name: 'Physics' },
  { code: 'ib-maths-aa-hl', name: 'Maths AA HL' },
  { code: '9999', name: 'Unknown' },
])
assert.ok(many.length >= 2)
assert.ok(many.some((t) => t.subjectCode === '9709'))
assert.ok(many.some((t) => t.subjectCode === '9702'))
assert.ok(many.some((t) => t.subjectCode === 'ib-maths-aa-hl'))
assert.ok(!many.some((t) => t.subjectCode === '9999'))

console.log('vault-diagram-showcase.test.ts: ok')

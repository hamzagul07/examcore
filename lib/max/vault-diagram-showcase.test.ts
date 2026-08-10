import assert from 'node:assert/strict'
import {
  buildVaultDiagramTheatre,
  buildVaultDiagramTheatres,
} from '@/lib/max/vault-diagram-showcase'
import { sampleVaultPlayback } from '@/lib/max/vault-diagram-playback'

const maths = buildVaultDiagramTheatre('9709', 'Mathematics')
assert.ok(maths)
assert.equal(maths!.subjectLabel, 'Mathematics')
assert.ok(maths!.signature)
assert.ok((maths!.signature!.teachingSteps?.length ?? 0) >= 3)

const physics = buildVaultDiagramTheatre('9702', 'Physics')
assert.ok(physics)
assert.equal(physics!.signature?.slug, '17-1-simple-harmonic-oscillations')

const edexcel = buildVaultDiagramTheatre('WMA11', 'Pure Mathematics 1')
assert.ok(edexcel, 'Edexcel WMA11 should map to maths cinema')
assert.ok(edexcel!.signature)

const aqa = buildVaultDiagramTheatre('aqa-mathematics', 'AQA Maths')
assert.ok(aqa)

const ap = buildVaultDiagramTheatre('ap-calculus-ab', 'AP Calculus AB')
assert.ok(ap)

const many = buildVaultDiagramTheatres([
  { code: '9709', name: 'Mathematics' },
  { code: '9702', name: 'Physics' },
  { code: 'ib-maths-aa-hl', name: 'Maths AA HL' },
  { code: 'WMA11', name: 'Pure Mathematics 1' },
  { code: '9999', name: 'Unknown' },
])
assert.ok(many.length >= 3)
assert.ok(many.some((t) => t.subjectCode === '9709'))
assert.ok(many.some((t) => t.subjectCode === '9702'))
assert.ok(many.some((t) => t.subjectCode === 'ib-maths-aa-hl'))
assert.ok(many.some((t) => t.subjectCode === 'WMA11'))
assert.ok(!many.some((t) => t.subjectCode === '9999'))

const emptyFallback = buildVaultDiagramTheatres([{ code: '9999', name: 'Unknown' }])
assert.equal(emptyFallback.length, 1)
assert.equal(emptyFallback[0]?.subjectCode, '9709')

const sample = sampleVaultPlayback('1-7-differentiation', 0.25, 4)
assert.ok(typeof sample.params.x0 === 'number')
assert.ok(sample.stepIndex >= 0 && sample.stepIndex <= 3)

console.log('vault-diagram-showcase.test.ts: ok')

import assert from 'node:assert/strict'
import { buildVaultDiagramTheatre } from '@/lib/max/vault-diagram-showcase'

const maths = buildVaultDiagramTheatre('9709')
assert.ok(maths)
assert.ok(maths!.signature)
assert.equal(maths!.signature!.chip, 'Signature')
assert.ok(maths!.gallery.length >= 3)
assert.ok(maths!.catalogCount >= 4)

const physics = buildVaultDiagramTheatre('9702')
assert.ok(physics?.signature?.slug.includes('specific-heat') || physics?.signature)

const ib = buildVaultDiagramTheatre('ib-maths-aa-hl')
assert.ok(ib)
assert.ok(ib!.signature)
assert.equal(ib!.subjectCode, 'ib-maths-aa-hl')

assert.equal(buildVaultDiagramTheatre(null), null)
assert.equal(buildVaultDiagramTheatre('9999'), null)

console.log('vault-diagram-showcase.test.ts: ok')

import assert from 'node:assert/strict'
import { resolveRequiredQuestionTotal } from './require-question-total'

{
  const out = resolveRequiredQuestionTotal({
    questionMarks: null,
    extractedTotal: null,
    hasOfficialSchemeTotal: false,
    hasIbCatalogTotal: false,
  })
  assert.equal(out.ok, false)
  if (!out.ok) {
    assert.match(out.message, /Enter the total marks/)
  }
}

{
  const out = resolveRequiredQuestionTotal({
    questionMarks: null,
    extractedTotal: null,
    hasOfficialSchemeTotal: false,
    hasIbCatalogTotal: false,
    marksInQuestion: true,
  })
  assert.equal(out.ok, false)
  if (!out.ok) {
    assert.match(out.message, /could not read the total marks/i)
  }
}

{
  const out = resolveRequiredQuestionTotal({
    questionMarks: 18,
    extractedTotal: null,
    hasOfficialSchemeTotal: false,
    hasIbCatalogTotal: false,
  })
  assert.deepEqual(out, { ok: true, total: 18 })
}

{
  const out = resolveRequiredQuestionTotal({
    questionMarks: null,
    extractedTotal: 9,
    hasOfficialSchemeTotal: false,
    hasIbCatalogTotal: false,
  })
  assert.deepEqual(out, { ok: true, total: 9 })
}

{
  const out = resolveRequiredQuestionTotal({
    questionMarks: null,
    extractedTotal: null,
    hasOfficialSchemeTotal: true,
    hasIbCatalogTotal: false,
  })
  assert.equal(out.ok, true, 'banked scheme skips the gate')
}

console.log('require-question-total: all assertions passed')

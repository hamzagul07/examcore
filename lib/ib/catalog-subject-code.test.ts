import assert from 'node:assert/strict'
import {
  catalogSubjectCode,
  isAliasedCatalogSubject,
} from '@/lib/ib/catalog-subject-code'
import { resolveIbCoreComponent } from '@/lib/ib/core-components'

// --- the mapping that was missing on the marking path -------------------------
//
// ib_subject holds `ib-language-b`, not `ib-french-b`. Without this the
// catalogue lookup asked for a subject that does not exist, returned null, and
// marking fell back to a holistic band with the verbatim criteria unused.

assert.equal(catalogSubjectCode('ib-french-b'), 'ib-language-b')
assert.equal(catalogSubjectCode('ib-spanish-b'), 'ib-language-b')
assert.equal(catalogSubjectCode('ib-english-a-lang-lit'), 'ib-lang-a-langlit')

// Identity for everything else, so callers apply it unconditionally rather than
// having to know which subjects are special.
assert.equal(catalogSubjectCode('ib-psychology'), 'ib-psychology')
assert.equal(catalogSubjectCode('ib-economics'), 'ib-economics')
assert.equal(catalogSubjectCode('ib-tok'), 'ib-tok')
assert.equal(catalogSubjectCode('anything-else'), 'anything-else')

assert.equal(catalogSubjectCode('  IB-French-B  '), 'ib-language-b', 'trims and lowercases')

assert.equal(isAliasedCatalogSubject('ib-french-b'), true)
assert.equal(isAliasedCatalogSubject('ib-psychology'), false)

// --- the Language B default ---------------------------------------------------
//
// Reached by elimination, not by guessing: of the three components only paper_1
// and io are criteria-marked, io is an oral that a typed or photographed text
// cannot be, and paper_2 is points-marked so carries no criteria at all.

const frenchSl = resolveIbCoreComponent('ib-french-b-sl')
assert.deepEqual(
  frenchSl,
  { subjectCode: 'ib-language-b', componentKey: 'paper_1', level: 'SL' },
  'the subject that failed in production now resolves'
)
assert.deepEqual(resolveIbCoreComponent('ib-spanish-b-hl'), {
  subjectCode: 'ib-language-b',
  componentKey: 'paper_1',
  level: 'HL',
})

// A Language B code without a level cannot pick between the HL and SL rows.
assert.equal(resolveIbCoreComponent('ib-french-b'), null)

// The existing core mappings must be untouched by the new branch.
assert.equal(resolveIbCoreComponent('ib-tok')?.componentKey, 'tok_essay')
assert.equal(
  resolveIbCoreComponent('ib-tok', 'Discuss the exhibition and three objects')
    ?.componentKey,
  'tok_exhibition'
)
assert.equal(resolveIbCoreComponent('ib-extended-essay')?.componentKey, 'ee')
assert.equal(
  resolveIbCoreComponent('ib-visual-arts-hl')?.subjectCode,
  'ib-visual-arts'
)

// Subjects deliberately left unmapped stay unmapped — a default for these would
// mark against the wrong assessment. See the note in core-components.ts.
for (const code of [
  'ib-english-a-lang-lit-sl',
  'ib-philosophy-hl',
  'ib-business-management-sl',
  'ib-geography-hl',
  'ib-history-hl',
]) {
  assert.equal(
    resolveIbCoreComponent(code),
    null,
    `${code} must not get a guessed default`
  )
}

// The Language B pattern must not swallow unrelated codes that happen to
// contain a "-b".
for (const code of ['ib-biology-hl', 'ib-business-management-hl', 'ib-tok']) {
  const r = resolveIbCoreComponent(code)
  assert.notEqual(
    r?.subjectCode,
    'ib-language-b',
    `${code} must not resolve as Language B`
  )
}

console.log('catalog-subject-code.test.ts: ok')

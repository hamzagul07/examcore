import assert from 'node:assert/strict'
import {
  catalogSubjectCode,
  componentIsPerQuestionSlots,
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

// --- Language A: Language and Literature -------------------------------------
//
// Paper 1 is guided analysis of one unseen text; Paper 2 a comparative essay on
// two studied works. Same test as the TOK essay/exhibition split: default to the
// ordinary practice exercise, switch only on an explicit signal.

assert.deepEqual(
  resolveIbCoreComponent('ib-english-a-lang-lit-sl'),
  { subjectCode: 'ib-lang-a-langlit', componentKey: 'paper_1', level: 'SL' },
  'guided analysis is the default'
)
for (const prompt of [
  'Compare and contrast the presentation of power in both works.',
  'In which two works does the writer use structure to…',
  'Write a comparative essay on the two texts.',
]) {
  assert.equal(
    resolveIbCoreComponent('ib-english-a-lang-lit-hl', prompt)?.componentKey,
    'paper_2',
    `a comparative prompt takes Paper 2: "${prompt.slice(0, 32)}…"`
  )
}
assert.equal(
  resolveIbCoreComponent(
    'ib-english-a-lang-lit-hl',
    'Analyse how the writer presents the narrator in this extract.'
  )?.componentKey,
  'paper_1',
  'a single-text prompt stays on Paper 1'
)

// English A: LITERATURE is a different subject with its own guide and no
// catalogue rows. Routing it to Language and Literature would mark a student
// against criteria from a subject they do not take.
assert.equal(resolveIbCoreComponent('ib-english-a-literature-hl'), null)
assert.equal(resolveIbCoreComponent('ib-english-a-literature-sl'), null)

// Subjects deliberately left unmapped stay unmapped — a default for these would
// mark against the wrong assessment. See the note in core-components.ts.
//
// Psychology and Economics matter most here: their components report
// assessment_model 'criteria', but the rows are per-question slots for a whole
// paper ("Section A: question 1", "Part (a) 10-mark question"), not assessment
// criteria. Wiring them would mark one practice answer against a five-question
// rubric.
for (const code of [
  'ib-psychology-hl',
  'ib-psychology-sl',
  'ib-economics-hl',
  'ib-economics-sl',
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

// --- per-question-slot components ---------------------------------------------
//
// These report assessment_model 'criteria' but their rows are the paper's
// questions. Production shows Economics practice answers marked out of 25 —
// "Part (a) 10-mark question" plus "Part (b) 15-mark question" — for a single
// essay. The holistic fallback is closer to right than a whole-paper rubric.

for (const [subject, component] of [
  ['ib-psychology', 'paper_1'],
  ['ib-psychology', 'paper_2'],
  ['ib-psychology', 'paper_3'],
  ['ib-economics', 'paper_1'],
  ['ib-economics', 'paper_2'],
  // "Section A—Core theme" (25) + two optional-theme essays: Paper 1 HL is
  // three essays out of 75.
  ['ib-philosophy', 'paper_1'],
  ['ib-philosophy', 'paper_2'],
  ['ib-philosophy', 'paper_3'],
  // "Paper 3 HL part a" (12), "part b" (16).
  ['ib-geography', 'paper_3'],
] as const) {
  assert.equal(
    componentIsPerQuestionSlots(subject, component),
    true,
    `${subject}/${component} must not supply a single answer's rubric`
  )
}

// The IA components ARE real criteria (Diagrams, Terminology, Evaluation;
// Introduction, Research methodology, Discussion) and must stay usable.
assert.equal(componentIsPerQuestionSlots('ib-psychology', 'ia'), false)
assert.equal(componentIsPerQuestionSlots('ib-economics', 'ia_commentary_1'), false)
assert.equal(componentIsPerQuestionSlots('ib-economics', 'ia_portfolio'), false)

// Everything else is unaffected — especially the two subjects this branch wired
// up, whose criteria are genuine assessment dimensions.
assert.equal(componentIsPerQuestionSlots('ib-language-b', 'paper_1'), false)
assert.equal(componentIsPerQuestionSlots('ib-lang-a-langlit', 'paper_1'), false)
assert.equal(componentIsPerQuestionSlots('ib-lang-a-langlit', 'paper_2'), false)
assert.equal(componentIsPerQuestionSlots('ib-tok', 'tok_essay'), false)
// Business Management's HL paper 3 IS criteria-marked — Use of resource
// materials, Tools and theories, Evaluation, Sequencing of ideas. A blanket
// rule excluding every `paper_*` would have blocked it, which is why the list
// is built by reading criterion names rather than by component type.
assert.equal(componentIsPerQuestionSlots('ib-business-management', 'paper_3'), false)
assert.equal(componentIsPerQuestionSlots('ib-philosophy', 'ia'), false)
assert.equal(componentIsPerQuestionSlots('ib-geography', 'ia'), false)
assert.equal(componentIsPerQuestionSlots('ib-biology', 'ia'), false)
assert.equal(componentIsPerQuestionSlots('ib-visual-arts', 'comparative_study_hl'), false)

assert.equal(
  componentIsPerQuestionSlots('  IB-Economics  ', '  Paper_1  '),
  true,
  'trims and lowercases both sides'
)

console.log('catalog-subject-code.test.ts: ok')

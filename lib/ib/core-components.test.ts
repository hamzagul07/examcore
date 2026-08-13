import assert from 'node:assert/strict'
import { resolveIbCoreComponent } from '@/lib/ib/core-components'

/**
 * Default component mapping for the subjects with no component picker.
 *
 * Pure routing — no database — but it decides which rubric a student is marked
 * against, and the components it chooses between are genuinely different
 * assessments. Sending a comparative study to the exhibition descriptors would
 * be a worse failure than the placeholder rubric this replaced.
 */
function main() {
  const r = (code: string, text?: string) => resolveIbCoreComponent(code, text)

  // --- core: no level, one obvious component ---------------------------------
  assert.deepEqual(r('ib-extended-essay', 'An investigation into enzyme kinetics.'), {
    subjectCode: 'ib-extended-essay',
    componentKey: 'ee',
    level: 'SL',
  })

  assert.equal(
    r('ib-tok', 'To what extent is certainty attainable?')?.componentKey,
    'tok_essay',
    'the essay is the default TOK submission'
  )
  assert.equal(
    r('ib-tok', 'My exhibition of three objects for the IA prompt.')?.componentKey,
    'tok_exhibition',
    'the exhibition is chosen only when named'
  )

  // --- visual arts: level lives in the component key ---------------------------
  assert.deepEqual(r('ib-visual-arts-hl', 'Compare and contrast three artworks.'), {
    subjectCode: 'ib-visual-arts',
    componentKey: 'comparative_study_hl',
    level: 'HL',
  })
  assert.equal(
    r('ib-visual-arts-sl', 'Compare and contrast three artworks.')?.componentKey,
    'comparative_study_sl',
    'SL must not be marked against the HL comparative study — 30 marks against 42'
  )
  assert.equal(
    r('ib-visual-arts-hl', 'My curatorial rationale for the exhibition.')?.componentKey,
    'exhibition_hl'
  )
  assert.equal(
    r('ib-visual-arts-sl', 'My process portfolio of media experiments.')?.componentKey,
    'process_portfolio',
    'the process portfolio is stored level-agnostic'
  )

  // --- subjects with no catalogued default fall through ------------------------
  // Film, Theatre, Music, Dance and CAS have no rows in the catalogue. Returning
  // a component for them would point the marker at a rubric that is not there.
  for (const code of [
    'ib-film-hl',
    'ib-theatre-hl',
    'ib-music-sl',
    'ib-dance-hl',
    'ib-cas',
    'ib-biology-hl',
  ]) {
    assert.equal(r(code, 'anything'), null, `${code} has no catalogued default`)
  }

  // Visual Arts without a resolvable level cannot pick a level-keyed component.
  assert.equal(r('ib-visual-arts', 'Compare three artworks.'), null)

  console.log('core-components.test.ts: ok')
}

main()

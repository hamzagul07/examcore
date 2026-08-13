import assert from 'node:assert/strict'
import {
  IB_MARKING_PROFILES,
  getIbMarkingProfile,
  getIbMarkableSubjectCodes,
} from '@/lib/ib/marking-config'

/**
 * Level coverage across IB marking profiles.
 *
 * An HL profile with no SL counterpart is not a cosmetic gap. `getIbMarkingProfile`
 * returns null for the missing level, so an SL student's mark loses its practice
 * style, its practice mark total, and — until this was fixed — even its subject
 * name, which meant the marking prompt was handed the literal string
 * "ib-maths-ai-sl" as the subject an examiner was marking.
 *
 * Both Maths courses were among the five missing, which is roughly the largest
 * SL cohort in the diploma.
 *
 * Paper structure below is asserted against the source-cited `ib_component`
 * catalogue, not against anybody's recollection of the syllabus.
 */
function main() {
  const codes = getIbMarkableSubjectCodes()

  // --- every HL has an SL twin, and vice versa --------------------------------
  const orphanHl = codes.filter(
    (c) => c.endsWith('-hl') && !codes.includes(c.replace(/-hl$/, '-sl'))
  )
  assert.deepEqual(
    orphanHl,
    [],
    `HL profiles with no SL twin: ${orphanHl.join(', ')} — SL students of these subjects get no marking profile at all`
  )

  const orphanSl = codes.filter(
    (c) => c.endsWith('-sl') && !codes.includes(c.replace(/-sl$/, '-hl'))
  )
  assert.deepEqual(orphanSl, [], `SL profiles with no HL twin: ${orphanSl.join(', ')}`)

  // --- the five that were missing ---------------------------------------------
  // Paper counts come from ib_component: each of these has an HL-only Paper 3.
  for (const [code, papers] of [
    ['ib-psychology-sl', ['Paper 1', 'Paper 2']],
    ['ib-business-management-sl', ['Paper 1', 'Paper 2']],
    ['ib-computer-science-sl', ['Paper 1', 'Paper 2']],
    ['ib-maths-aa-sl', ['Paper 1', 'Paper 2']],
    ['ib-maths-ai-sl', ['Paper 1', 'Paper 2']],
  ] as const) {
    const p = getIbMarkingProfile(code)
    assert.ok(p, `${code} must resolve a marking profile`)
    assert.equal(p!.level, 'SL')
    assert.deepEqual(
      Object.keys(p!.papers).sort(),
      [...papers].sort(),
      `${code} must not claim the HL-only Paper 3`
    )
    const hl = getIbMarkingProfile(code.replace(/-sl$/, '-hl'))
    assert.ok(hl, 'the HL twin must exist')
    assert.equal(p!.name, hl!.name, 'both levels name the same subject')
    assert.equal(
      p!.practiceStyle,
      hl!.practiceStyle,
      'a question is marked the same way at either level; only the paper set differs'
    )
    // Guard the specific bug: SL must never inherit an HL-only component.
    assert.ok(
      !('Paper 3' in p!.papers),
      `${code} has no Paper 3 — that component is HL-only`
    )
  }

  // --- shape sanity across every profile ---------------------------------------
  for (const p of IB_MARKING_PROFILES) {
    assert.ok(p.name.trim(), `${p.code} needs a human name`)
    assert.notEqual(p.name, p.code, `${p.code} must not use its own code as a name`)
    assert.ok(
      p.practiceMaxMarks > 0,
      `${p.code} needs a practice mark total — it is the denominator of a generated question`
    )
    if (p.criteria?.length) {
      // Criteria totals feed the authoritative denominator in reconcile-marks,
      // so a zero-mark criterion would silently distort a score.
      for (const c of p.criteria) {
        assert.ok(c.maxMarks > 0, `${p.code} criterion ${c.id} needs a max`)
        assert.ok(c.bands.length > 0, `${p.code} criterion ${c.id} needs bands`)
      }
    }
  }

  console.log(`marking-profiles.test.ts: ok (${codes.length} profiles)`)
}

main()

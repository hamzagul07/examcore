/**
 * Apply reviewed operational marking guidance onto catalogued criteria.
 *
 *   node scripts/apply-ib-guidance.mjs <guidance.json> [--apply]
 *
 * Additive by design. Guidance never touches a descriptor: the verbatim text is
 * what a student is assessed against and is sent to the marker unchanged, with
 * guidance riding alongside to say how the level is applied. This script writes
 * only `marking_guidance` columns, so a bad batch can be cleared without
 * disturbing the licensed content.
 *
 * Refuses unless the component already exists — guidance for a component that
 * was never ingested is guidance nobody will ever read.
 */
process.loadEnvFile?.('.env.local')

import fs from 'node:fs'

const args = process.argv.slice(2)
const jsonPath = args.find((a) => !a.startsWith('--'))
const APPLY = args.includes('--apply')

if (!jsonPath) {
  console.error('usage: apply-ib-guidance.mjs <guidance.json> [--apply]')
  process.exit(1)
}

async function main() {
  const g = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const { subjectCode, componentKey } = g
  if (!subjectCode || !componentKey) {
    console.error('[guidance] file has no subjectCode/componentKey')
    process.exit(1)
  }

  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // A component key is not unique: HL and SL are separate rows sharing one key
  // wherever the levels sit different papers. Guidance about how a criterion is
  // applied is normally level-agnostic, so it goes to every matching row —
  // reported, not silent — and `--level` narrows it when it genuinely differs.
  const levelArg = args.includes('--level') ? args[args.indexOf('--level') + 1] : null
  let q = db
    .from('ib_component')
    .select('id, label, level')
    .eq('subject_code', subjectCode)
    .eq('component_key', componentKey)
  if (levelArg) q = q.eq('level', levelArg)
  const { data: comps, error: compErr } = await q
  if (compErr) throw new Error(`component lookup: ${compErr.message}`)

  if (!comps?.length) {
    console.error(
      `[guidance] refusing: ${subjectCode}/${componentKey}${levelArg ? ` (${levelArg})` : ''} is not in the catalogue. Ingest the criteria first.`
    )
    process.exit(1)
  }

  const { data: allCriteria } = await db
    .from('ib_criterion')
    .select('id, letter, component_id')
    .in('component_id', comps.map((c) => c.id))

  const plan = []
  if (g.component_guidance?.trim()) {
    plan.push(`component: ${g.component_guidance.trim().slice(0, 90)}…`)
  }
  let bandWrites = 0
  const letters = new Set((allCriteria ?? []).map((c) => c.letter))
  for (const c of g.criteria ?? []) {
    if (!letters.has(c.letter)) {
      console.error(`[guidance] warning: criterion ${c.letter} not in catalogue — skipped`)
      continue
    }
    if (c.guidance?.trim()) {
      plan.push(`criterion ${c.letter}: ${c.guidance.trim().slice(0, 90)}…`)
    }
    for (const b of c.bands ?? []) {
      if (b.guidance?.trim()) bandWrites++
    }
  }

  console.log(
    `\n${subjectCode}/${componentKey} — ${comps.length} component row(s): ${comps.map((c) => `${c.label} [${c.level}]`).join(', ')}`
  )
  for (const p of plan) console.log(`  ${p}`)
  console.log(`  ${bandWrites} band-level note(s) per component`)

  if (!APPLY) {
    console.log('\nDry run. Nothing written. Re-run with --apply.\n')
    return
  }

  if (g.component_guidance?.trim()) {
    const { error } = await db
      .from('ib_component')
      .update({ marking_guidance: g.component_guidance.trim() })
      .in('id', comps.map((c) => c.id))
    if (error) throw new Error(`component: ${error.message}`)
  }

  let written = 0
  for (const comp of comps) {
    const byLetter = new Map(
      (allCriteria ?? [])
        .filter((c) => c.component_id === comp.id)
        .map((c) => [c.letter, c.id])
    )
    for (const c of g.criteria ?? []) {
      const critId = byLetter.get(c.letter)
      if (!critId) continue
      if (c.guidance?.trim()) {
        const { error } = await db
          .from('ib_criterion')
          .update({ marking_guidance: c.guidance.trim() })
          .eq('id', critId)
        if (error) throw new Error(`criterion ${c.letter}: ${error.message}`)
        written++
      }
      for (const b of c.bands ?? []) {
        if (!b.guidance?.trim()) continue
        const { error } = await db
          .from('ib_criterion_band')
          .update({ marking_guidance: b.guidance.trim() })
          .eq('criterion_id', critId)
          .eq('marks_min', b.marks_min)
          .eq('marks_max', b.marks_max)
        if (error) throw new Error(`band ${c.letter} ${b.marks_min}-${b.marks_max}: ${error.message}`)
        written++
      }
    }
  }

  console.log(`\n[guidance] ${subjectCode}/${componentKey}: ${written} note(s) written.\n`)
}

main().catch((e) => {
  console.error('[guidance] failed:', e?.message ?? e)
  process.exit(1)
})

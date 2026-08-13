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

  const { data: comp } = await db
    .from('ib_component')
    .select('id, label')
    .eq('subject_code', subjectCode)
    .eq('component_key', componentKey)
    .maybeSingle()

  if (!comp) {
    console.error(
      `[guidance] refusing: ${subjectCode}/${componentKey} is not in the catalogue. Ingest the criteria first.`
    )
    process.exit(1)
  }

  const { data: criteria } = await db
    .from('ib_criterion')
    .select('id, letter')
    .eq('component_id', comp.id)
  const byLetter = new Map((criteria ?? []).map((c) => [c.letter, c.id]))

  const plan = []
  if (g.component_guidance?.trim()) {
    plan.push(`component ${comp.label}: ${g.component_guidance.trim().slice(0, 90)}…`)
  }
  let bandWrites = 0
  for (const c of g.criteria ?? []) {
    if (!byLetter.has(c.letter)) {
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

  console.log(`\n${subjectCode}/${componentKey} — ${comp.label}`)
  for (const p of plan) console.log(`  ${p}`)
  console.log(`  ${bandWrites} band-level note(s)`)

  if (!APPLY) {
    console.log('\nDry run. Nothing written. Re-run with --apply.\n')
    return
  }

  if (g.component_guidance?.trim()) {
    const { error } = await db
      .from('ib_component')
      .update({ marking_guidance: g.component_guidance.trim() })
      .eq('id', comp.id)
    if (error) throw new Error(`component: ${error.message}`)
  }

  let written = 0
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

  console.log(`\n[guidance] ${subjectCode}/${componentKey}: ${written} note(s) written.\n`)
}

main().catch((e) => {
  console.error('[guidance] failed:', e?.message ?? e)
  process.exit(1)
})

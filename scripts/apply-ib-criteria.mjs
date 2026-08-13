/**
 * Apply a reviewed IB criteria extraction into the catalogue.
 *
 *   node scripts/apply-ib-criteria.mjs <extract.json> --guide "Film Guide 2023" \
 *        --group "The Arts" --scope HL_SL --first-assessment 2023 \
 *        --confirm-current [--name "Film"] [--apply]
 *
 * Currency is not optional: pass --last-assessment <year> when the guide has
 * been replaced, or --confirm-current when it has no published end date. The
 * guide will not tell you which — the IB's curriculum-update pages will.
 *
 * The other half of `extract-ib-criteria.mjs`, which deliberately stops at JSON
 * because a wrong rubric in front of a student is worse than no rubric. Without
 * an apply step, though, reviewed extractions simply sat on disk — a Film
 * extraction had been waiting unapplied while marking used an invented rubric
 * instead.
 *
 * Refuses by default. Prints exactly what it would write and exits; `--apply`
 * is the deliberate act. Refuses outright when the extraction still has bands
 * that failed the verbatim check, unless `--allow-suspect` says a human has
 * looked at each one.
 *
 * Idempotent per subject: re-applying replaces that subject's components,
 * criteria and bands rather than duplicating them.
 */
process.loadEnvFile?.('.env.local')

import fs from 'node:fs'

const args = process.argv.slice(2)
const jsonPath = args.find((a) => !a.startsWith('--'))
const flag = (name) => args.includes(`--${name}`)
const opt = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

if (!jsonPath) {
  console.error('usage: apply-ib-criteria.mjs <extract.json> --guide <title> --group <group> --scope <HL_SL|HL_only|SL_only|Core> [--apply]')
  process.exit(1)
}

const APPLY = flag('apply')
const ALLOW_SUSPECT = flag('allow-suspect')

/**
 * PDF text extraction leaves a space before punctuation ("This work is good .").
 * Those descriptors are shown to students, so the artifact is cleaned on the way
 * in — but only whitespace is touched. Wording is never altered: the whole point
 * of this table is that it holds what the IB actually wrote.
 */
function tidy(descriptor) {
  return descriptor
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s+•\s*/g, ' • ')
    .trim()
}

async function main() {
  const extract = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const subjectCode = extract.subjectCode
  const components = extract.components ?? []

  if (!subjectCode || components.length === 0) {
    console.error('[apply] extraction has no subjectCode or no components')
    process.exit(1)
  }

  if (extract.bandsNotFoundVerbatim > 0 && !ALLOW_SUSPECT) {
    console.error(
      `[apply] refusing: ${extract.bandsNotFoundVerbatim} band(s) failed the verbatim check.\n` +
        '        Review each one against the guide, then re-run with --allow-suspect.'
    )
    for (const s of extract.suspect ?? []) console.error('  -', s)
    process.exit(1)
  }

  // Structural check the extractor cannot make: criteria must account for the
  // component total. A component whose parts do not means the extraction
  // dropped or invented a criterion, and every mark out of it would be computed
  // against the wrong denominator.
  //
  // Exactly one legitimate exception: some components apply their criteria more
  // than once — IB Film's portfolio is marked out of 10 for each of three
  // production roles, giving a component total of 30. That shows up as an exact
  // integer multiple, and is reported rather than waved through, because it
  // changes what a mark out of that component even means.
  const mismatches = []
  const repeated = []
  for (const c of components) {
    const sum = (c.criteria ?? []).reduce((n, cr) => n + (cr.max_marks ?? 0), 0)
    if (c.max_marks == null || sum === c.max_marks) continue
    if (sum > 0 && c.max_marks % sum === 0) {
      repeated.push(`${c.component_key}: criteria total ${sum}, applied ${c.max_marks / sum}× for a component max of ${c.max_marks}`)
    } else {
      mismatches.push(`${c.component_key}: criteria sum ${sum} ≠ component max ${c.max_marks}`)
    }
  }
  if (mismatches.length) {
    console.error('[apply] refusing: criteria do not account for component totals')
    for (const m of mismatches) console.error('  -', m)
    process.exit(1)
  }
  for (const r of repeated) console.log(`[apply] note — ${r}`)

  // Pre-flight every row BEFORE anything is deleted.
  //
  // Applying replaces a subject's components, so a failure partway through the
  // inserts leaves the catalogue holding half a subject — which is worse than
  // the placeholder it replaced, because marking would then resolve a component
  // whose criteria never arrived. Found the hard way: the HL film reel is a
  // single unlettered criterion, and `letter` is NOT NULL.
  const problems = []
  for (const c of components) {
    if (!c.component_key || !c.label || !c.level) {
      problems.push(`${c.component_key ?? '(no key)'}: missing key, label or level`)
    }
    for (const cr of c.criteria ?? []) {
      if (cr.max_marks == null) problems.push(`${c.component_key}/${cr.letter ?? '?'}: criterion has no max_marks`)
      for (const b of cr.bands ?? []) {
        if (b.marks_min == null || b.marks_max == null || !b.descriptor?.trim()) {
          problems.push(`${c.component_key}/${cr.letter ?? '?'}: band missing marks or descriptor`)
        }
      }
    }
  }
  if (problems.length) {
    console.error('[apply] refusing: rows would not satisfy the schema')
    for (const p of problems.slice(0, 10)) console.error('  -', p)
    process.exit(1)
  }

  // Currency gate. This is the check whose absence let a Theatre 2017 rubric —
  // last assessed in 2023, four criteria where the current course has three,
  // and an internal assessment that no longer exists — go live against real
  // students. A guide's cover states when it started, never when it stopped, so
  // the end date has to be supplied deliberately and is refused by default when
  // it has passed.
  const lastAssessment = opt('last-assessment') ? Number(opt('last-assessment')) : null
  const thisSession = new Date().getFullYear()
  if (lastAssessment != null && lastAssessment < thisSession && !flag('allow-withdrawn')) {
    console.error(
      `[apply] refusing: this guide was last assessed in ${lastAssessment}, before the ${thisSession} session.\n` +
        '        Students studying now sit a newer guide. Ingest that one, or pass\n' +
        '        --allow-withdrawn if this is deliberately for past-paper revision.'
    )
    process.exit(1)
  }
  if (lastAssessment == null && !flag('confirm-current')) {
    console.error(
      '[apply] refusing: no --last-assessment given.\n' +
        '        Check the IB curriculum-update pages for whether this guide has been\n' +
        '        replaced — the guide itself will not say. Then pass --last-assessment <year>,\n' +
        '        or --confirm-current if it has no published end date.'
    )
    process.exit(1)
  }

  console.log(`\n${subjectCode} — from ${extract.source}`)
  for (const c of components) {
    const bands = (c.criteria ?? []).reduce((n, cr) => n + (cr.bands?.length ?? 0), 0)
    console.log(
      `  ${c.component_key.padEnd(28)} ${String(c.level).padEnd(5)} /${String(c.max_marks).padEnd(4)} ${(c.criteria ?? []).length} criteria, ${bands} bands`
    )
  }

  if (!APPLY) {
    console.log('\nDry run. Nothing written. Re-run with --apply to commit.\n')
    return
  }

  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const guide = opt('guide') ?? extract.source
  const firstAssessment = opt('first-assessment')
    ? Number(opt('first-assessment'))
    : null

  const { data: doc, error: docErr } = await db
    .from('ib_source_document')
    .insert({
      title: guide,
      doc_type: 'subject_guide',
      subject_code: subjectCode,
      cycle_version: opt('cycle') ?? String(firstAssessment ?? 'unknown'),
      first_assessment_year: firstAssessment,
      last_assessment_year: lastAssessment,
      storage_path: extract.source,
      notes: `Extracted from pages ${extract.pagesUsed?.join('-')} on ${extract.extractedAt}. ${extract.bandsChecked} bands, ${extract.bandsNotFoundVerbatim} not found verbatim.`,
    })
    .select('id')
    .single()
  if (docErr) throw new Error(`source document: ${docErr.message}`)

  const { error: subjErr } = await db.from('ib_subject').upsert(
    {
      code: subjectCode,
      name: opt('name') ?? subjectCode.replace(/^ib-/, '').replace(/-/g, ' '),
      subject_group: opt('group') ?? 'The Arts',
      level_scope: opt('scope') ?? 'HL_SL',
      guide_version: opt('cycle') ?? String(firstAssessment ?? 'unknown'),
      first_assessment_year: firstAssessment,
      last_assessment_year: lastAssessment,
      source_document_id: doc.id,
    },
    { onConflict: 'code' }
  )
  if (subjErr) throw new Error(`subject: ${subjErr.message}`)

  // Replace rather than append: re-running after a corrected extraction must
  // not leave the previous version's criteria alongside the new ones.
  const { data: old } = await db
    .from('ib_component')
    .select('id')
    .eq('subject_code', subjectCode)
  if (old?.length) {
    await db.from('ib_component').delete().eq('subject_code', subjectCode)
    console.log(`[apply] replaced ${old.length} existing component(s)`)
  }

  let bandCount = 0
  for (const c of components) {
    const { data: comp, error: compErr } = await db
      .from('ib_component')
      .insert({
        subject_code: subjectCode,
        component_key: c.component_key,
        label: c.label,
        level: c.level,
        assessment_model: 'criteria',
        max_marks: c.max_marks,
        source_document_id: doc.id,
      })
      .select('id')
      .single()
    if (compErr) throw new Error(`component ${c.component_key}: ${compErr.message}`)

    for (const [i, cr] of (c.criteria ?? []).entries()) {
      // Not every component letters its criteria — the HL film reel is one
      // holistic judgement — but the column is NOT NULL, so fall back to
      // position rather than dropping the criterion.
      const letter = cr.letter?.trim() || String.fromCharCode(65 + i)
      const { data: crit, error: critErr } = await db
        .from('ib_criterion')
        .insert({
          component_id: comp.id,
          letter,
          name: cr.name,
          max_marks: cr.max_marks,
          ordinal: i + 1,
          source_document_id: doc.id,
          source_pages: cr.source_pages ?? null,
        })
        .select('id')
        .single()
      if (critErr) throw new Error(`criterion ${c.component_key}/${letter}: ${critErr.message}`)

      const bands = (cr.bands ?? []).map((b) => ({
        criterion_id: crit.id,
        marks_min: b.marks_min,
        marks_max: b.marks_max,
        descriptor: tidy(b.descriptor),
        source_document_id: doc.id,
        source_pages: cr.source_pages ?? null,
      }))
      if (bands.length) {
        const { error: bandErr } = await db.from('ib_criterion_band').insert(bands)
        if (bandErr) throw new Error(`bands ${c.component_key}/${letter}: ${bandErr.message}`)
        bandCount += bands.length
      }
    }
  }

  console.log(
    `\n[apply] ${subjectCode}: ${components.length} components, ${bandCount} verbatim bands written.\n`
  )
}

main().catch((e) => {
  console.error('[apply] failed:', e?.message ?? e)
  process.exit(1)
})

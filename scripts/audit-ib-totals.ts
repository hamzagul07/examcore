/**
 * Does every IB component's criteria add up to the component's own total?
 *
 *   pnpm audit:ib-totals
 *
 * They must, because two different parts of the pipeline read the two different
 * numbers and neither knows the other exists:
 *
 *   build-marking-prompt.ts  total = component.max_marks ?? sum(criteria)
 *   reconcile-marks.ts       total = sum(criteria), always
 *
 * So when they disagree the model is told the paper is out of one number and the
 * student is shown a score out of another. Economics Paper 2 was prompted out of
 * 40 and scored out of 15 — a mark of 12 shown as 80% when the paper says 30%.
 * Nothing failed, nothing logged, and the breakdown looked internally consistent
 * because reconcile rebuilds it from the criteria it summed.
 *
 * There are two ways to land here and they need different fixes:
 *
 *   MISSING CRITERIA — the component total is right and the catalogue is short
 *   of rows. Ingest the rest from the guide.
 *
 *   REPEATED CRITERION — the total is right and the criteria are right, but one
 *   is applied more than once. Philosophy HL Paper 1 is 75 because section B is
 *   answered twice at 25 each; the catalogue can only say 25 once. Model the
 *   repeat explicitly (two rows) rather than inflating one criterion's max,
 *   because the band descriptors are written for a single 25-mark answer.
 *
 * This script cannot tell them apart — that needs the guide — so it reports the
 * gap and leaves the judgement to a human holding the PDF.
 *
 * Exits non-zero on any NEW mismatch. Three are known and waiting on guides we
 * do not have (see KNOWN below) — they are still printed, but they do not fail
 * the run, because a check that is permanently red is one people stop reading.
 * Fix one and remove its line; the run stays green. Introduce a fourth and it
 * goes red immediately, which is the whole point.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

type ComponentRow = {
  id: string
  subject_code: string
  component_key: string
  label: string | null
  level: string | null
  max_marks: number | null
}

type CriterionRow = {
  id: string
  component_id: string
  letter: string | null
  name: string | null
  max_marks: number | null
}

type BandRow = {
  criterion_id: string
  marks_min: number | null
  marks_max: number | null
}

/**
 * Mismatches that already existed when this check was written, each waiting on a
 * document nobody has. Keyed `subject_code/component_key/level`.
 *
 * Deliberately not a blanket "ignore economics": the key includes the level, so
 * economics paper 2 breaking at HL in some new way would still be caught.
 */
const KNOWN: Record<string, string> = {
  'ib-economics/paper_2/SL':
    'Only part (g) (15 marks) is catalogued; parts (a)-(f) are point-marked. Needs the economics guide to model properly.',
  'ib-economics/paper_2/HL':
    'Only part (g) (15 marks) is catalogued; parts (a)-(f) are point-marked. Needs the economics guide to model properly.',
  'ib-business-management/paper_3/HL':
    'Four criteria sum to 17 against a component of 25. Needs the business management guide.',
}

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const { fetchAllRows } = await import('../lib/supabase/fetch-all')
  const service = createServiceClient()

  // Read every row, not the first page. An audit that silently sees 1,000 of
  // 4,000 rows reports a clean bill of health it did not earn.
  const components = (
    await fetchAllRows<ComponentRow>(
      service,
      'ib_component',
      'id, subject_code, component_key, level, max_marks'
    )
  ).sort(
    (a, b) =>
      a.subject_code.localeCompare(b.subject_code) ||
      a.component_key.localeCompare(b.component_key)
  )
  const criteria = await fetchAllRows<CriterionRow>(
    service,
    'ib_criterion',
    'id, component_id, letter, name, max_marks'
  )
  const bands = await fetchAllRows<BandRow>(
    service,
    'ib_criterion_band',
    'criterion_id, marks_min, marks_max'
  )

  const byComponent = new Map<string, CriterionRow[]>()
  for (const c of criteria) {
    const list = byComponent.get(c.component_id) ?? []
    list.push(c)
    byComponent.set(c.component_id, list)
  }

  const problems: string[] = []
  const known: string[] = []
  let checked = 0
  let noCriteria = 0

  for (const comp of components) {
    const rows = byComponent.get(comp.id) ?? []
    // A component with no criteria at all is a different thing — points-based
    // or holistic components legitimately have none, and reconcile never runs
    // the criteria path for them.
    if (rows.length === 0) {
      noCriteria++
      continue
    }
    if (comp.max_marks == null) {
      problems.push(
        `${comp.subject_code}  ${comp.component_key} (${comp.level ?? '?'})  ` +
          `no component total, criteria sum to ${rows.reduce((s, r) => s + (r.max_marks ?? 0), 0)}`
      )
      continue
    }
    checked++
    const sum = rows.reduce((s, r) => s + (r.max_marks ?? 0), 0)
    if (sum !== comp.max_marks) {
      const gap = comp.max_marks - sum
      const knownKey = `${comp.subject_code}/${comp.component_key}/${comp.level ?? '?'}`
      if (KNOWN[knownKey]) {
        known.push(
          `${comp.subject_code}  ${comp.component_key} (${comp.level ?? '?'})  ` +
            `${comp.max_marks} vs ${sum}  — ${KNOWN[knownKey]}`
        )
        continue
      }
      problems.push(
        `${comp.subject_code}  ${comp.component_key} (${comp.level ?? '?'})  ` +
          `component says ${comp.max_marks}, ${rows.length} criteria sum to ${sum}  ` +
          `[${gap > 0 ? `${gap} unaccounted` : `${-gap} over`}]\n` +
          rows
            .map((r) => `        ${(r.letter ?? '–').padEnd(3)} ${String(r.max_marks ?? 0).padStart(3)}  ${r.name ?? ''}`)
            .join('\n')
      )
    }
  }

  // A criterion is only markable if its bands reach both ends. A ladder that
  // stops short of the maximum cannot award full marks; one that starts at 1
  // cannot award zero, which floors a response that meets nothing — the whole
  // extended essay was like that, generous on five criteria at once, because
  // its guide states the zero case as a note above the table rather than as a
  // row in it.
  const bandsByCriterion = new Map<string, BandRow[]>()
  for (const b of bands) {
    const list = bandsByCriterion.get(b.criterion_id) ?? []
    list.push(b)
    bandsByCriterion.set(b.criterion_id, list)
  }
  const ladderProblems: string[] = []
  const componentById = new Map(components.map((c) => [c.id, c]))
  for (const cr of criteria) {
    const comp = componentById.get(cr.component_id)
    if (!comp) continue
    const rows = bandsByCriterion.get(cr.id) ?? []
    const where = `${comp.subject_code}  ${comp.component_key} (${comp.level ?? '?'})  ${cr.letter ?? '-'} ${cr.name ?? ''}`
    if (rows.length === 0) {
      ladderProblems.push(`${where}: no bands — nothing for a marker to choose`)
      continue
    }
    const lo = Math.min(...rows.map((r) => r.marks_min ?? 0))
    const hi = Math.max(...rows.map((r) => r.marks_max ?? 0))
    if (lo > 0) ladderProblems.push(`${where}: bands start at ${lo}, so 0 cannot be awarded`)
    if (cr.max_marks != null && hi !== cr.max_marks) {
      ladderProblems.push(`${where}: bands reach ${hi} but the criterion is out of ${cr.max_marks}`)
    }
  }

  console.log(
    `\nIB COMPONENT TOTALS — ${checked} component(s) with criteria checked, ` +
      `${noCriteria} without criteria skipped\n`
  )

  if (ladderProblems.length) {
    console.log(`BAND LADDER (${ladderProblems.length})`)
    console.log('  A criterion whose bands do not reach both ends cannot award both ends.\n')
    for (const p of ladderProblems) console.log(`  ${p}`)
    console.log('')
    process.exitCode = 1
  }

  if (known.length) {
    console.log(`KNOWN, NOT FAILING (${known.length})`)
    console.log('  Already wrong before this check existed, each waiting on a guide.\n')
    for (const k of known) console.log(`  ${k}`)
    console.log('')
  }

  if (problems.length === 0) {
    console.log('No new mismatches.\n')
    return
  }

  console.log(`MISMATCH (${problems.length})`)
  console.log(
    '  The model is prompted with the component total; the student is scored on\n' +
      '  the criteria sum. While these differ, the percentage shown is wrong.\n'
  )
  for (const p of problems) console.log(`  ${p}\n`)
  console.log(
    'Fix by ingesting the missing criteria, or by adding a row for a criterion\n' +
      'the guide applies more than once. Do not stretch one criterion\'s max to\n' +
      'close the gap — its band descriptors are written for the smaller number.\n'
  )
  process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

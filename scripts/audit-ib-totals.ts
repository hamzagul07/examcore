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
 * Exits non-zero on any mismatch.
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
  component_id: string
  letter: string | null
  name: string | null
  max_marks: number | null
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
    'component_id, letter, name, max_marks'
  )

  const byComponent = new Map<string, CriterionRow[]>()
  for (const c of criteria) {
    const list = byComponent.get(c.component_id) ?? []
    list.push(c)
    byComponent.set(c.component_id, list)
  }

  const problems: string[] = []
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

  console.log(
    `\nIB COMPONENT TOTALS — ${checked} component(s) with criteria checked, ` +
      `${noCriteria} without criteria skipped\n`
  )

  if (problems.length === 0) {
    console.log('Every component total matches the sum of its criteria.\n')
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

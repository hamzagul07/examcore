/**
 * Math AA calibration harness (DoD). Runs curated cases through the M1 catalog
 * points marking path and reports agreement with official markschemes.
 *
 *   npx tsx lib/ib/calibration/run-calibration.ts [casesFile]
 *
 * Default casesFile is git-ignored (contains licensed past-paper question text).
 * The PASS/SHIP THRESHOLD is the operator's call — this only reports metrics:
 * exact-match %, +/-1 %, ECF behavior, and every miss.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

// tsx does not auto-load .env.local the way Next does.
const envPath = path.resolve(process.cwd(), '.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (!m) continue
  let v = m[2].trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!(m[1] in process.env)) process.env[m[1]] = v
}

type Case = {
  id: string
  component_key: string
  level: 'HL' | 'SL'
  category: 'correct' | 'flawed' | 'wrong'
  expected: number
  tolerance?: number
  note?: string
  question: string
  answer: string
}

async function main() {
  const { resolveComponentForMarking } = await import('../assessment-catalog')
  const { markSingleQuestion } = await import('../../marking/mark-runner')

  const casesFile =
    process.argv[2] ||
    'docs/ib-ingestion/math-aa-sl-calibration-cases.json'
  const { cases } = JSON.parse(readFileSync(path.resolve(process.cwd(), casesFile), 'utf8')) as {
    cases: Case[]
  }

  const rows: Array<{
    id: string
    category: string
    expected: number
    got: number
    total: number
    delta: number
    withinTol: boolean
    exact: boolean
  }> = []

  for (const c of cases) {
    const resolved = await resolveComponentForMarking('ib-maths-aa', c.level, c.component_key)
    if (!resolved) throw new Error(`could not resolve ${c.component_key} ${c.level}`)
    const res = await markSingleQuestion({
      ocrText: c.answer,
      ocrLines: [],
      questionText: c.question,
      markScheme: null,
      markingMode: 'general_criteria_practice',
      paperCode: `ib-maths-aa-${c.level.toLowerCase()}/00`,
      resolvedIb: resolved,
    })
    const mr = res.markingResult as Record<string, unknown>
    const got = Number(mr.marks_earned)
    const total = Number(mr.total_marks)
    const tol = c.tolerance ?? 0
    const delta = got - c.expected
    rows.push({
      id: c.id,
      category: c.category,
      expected: c.expected,
      got,
      total,
      delta,
      withinTol: Math.abs(delta) <= tol,
      exact: delta === 0,
    })
    console.log(
      `${c.id.padEnd(26)} [${c.category.padEnd(7)}] expected=${c.expected} got=${got}/${total} delta=${delta >= 0 ? '+' : ''}${delta}`
    )
  }

  const correct = rows.filter((r) => r.category === 'correct')
  const exactCorrect = correct.filter((r) => r.exact).length
  const within1All = rows.filter((r) => Math.abs(r.delta) <= 1).length

  console.log('\n=== CALIBRATION REPORT (Math AA SL, catalog points path) ===')
  console.log(`cases: ${rows.length}  (correct: ${correct.length}, flawed/wrong: ${rows.length - correct.length})`)
  console.log(
    `exact full-mark match on CORRECT cases: ${exactCorrect}/${correct.length}  (${Math.round((100 * exactCorrect) / Math.max(1, correct.length))}%)`
  )
  console.log(
    `+/-1 mark agreement (all cases): ${within1All}/${rows.length}  (${Math.round((100 * within1All) / rows.length)}%)`
  )
  const misses = rows.filter((r) => !r.exact && r.category === 'correct')
    .concat(rows.filter((r) => r.category !== 'correct' && !r.withinTol))
  if (misses.length) {
    console.log('\nMISSES (need review):')
    for (const m of misses) {
      const c = cases.find((x) => x.id === m.id)!
      console.log(`  ${m.id}: expected ${m.expected}, got ${m.got}/${m.total} (delta ${m.delta >= 0 ? '+' : ''}${m.delta}) — ${c.note ?? 'fully-correct answer should earn full marks'}`)
    }
  } else {
    console.log('\nNo misses outside tolerance.')
  }
  console.log('\nThreshold is operator-set; this report does not assert pass/fail.')
}

main().catch((e) => {
  console.error('CALIBRATION FAILED:', e)
  process.exit(1)
})

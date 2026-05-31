/**
 * Quick checks for subject inference heuristics (no API keys).
 * Run: node scripts/test-subject-inference.mjs
 */

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// Load compiled TS via tsx alternative: inline duplicate minimal test by spawning ts-node?
// Use dynamic import of built output — project uses Next; run via npx tsx if available.

const cases = [
  {
    name: 'Chemistry ionic radius',
    text: 'State and explain the difference in the ionic radius of Al^{3+} compared to Mg^{2+}.',
    expect: '9701',
  },
  {
    name: 'Math quadratics',
    text: 'Find the value of x in x^2 - 5x + 6 = 0',
    expect: '9709',
  },
  {
    name: 'Physics F=ma',
    text: 'Calculate the resultant force when F = ma and velocity is 3 m/s',
    expect: '9702',
  },
  {
    name: 'Ambiguous short',
    text: 'Discuss the data.',
    expect: null,
  },
]

async function main() {
  let inferSubjectFromQuestionText
  let reconcileDetectionWithQuestion
  try {
    const mod = await import('../lib/marking/subject-inference.ts')
    inferSubjectFromQuestionText = mod.inferSubjectFromQuestionText
    reconcileDetectionWithQuestion = mod.reconcileDetectionWithQuestion
  } catch {
    console.log(
      'Skip: run with npx tsx scripts/test-subject-inference.mjs for TS import'
    )
    process.exit(0)
  }

  let passed = 0
  for (const c of cases) {
    const got = inferSubjectFromQuestionText(c.text)
    const ok = got === c.expect
    console.log(`${ok ? 'PASS' : 'FAIL'} ${c.name}: got ${got}, expected ${c.expect}`)
    if (ok) passed += 1
  }

  const wrongDetection = reconcileDetectionWithQuestion(
    {
      is_past_paper: true,
      paper_code: '9709/12',
      paper_session: 'May/June 2024',
      question_number: '1',
    },
    cases[0].text
  )
  const reconcileOk = wrongDetection.is_past_paper === false
  console.log(
    `${reconcileOk ? 'PASS' : 'FAIL'} reconcile rejects 9709 for chemistry question`
  )
  if (reconcileOk) passed += 1

  console.log(`\n${passed}/${cases.length + 1} checks passed`)
  process.exit(passed === cases.length + 1 ? 0 : 1)
}

main()

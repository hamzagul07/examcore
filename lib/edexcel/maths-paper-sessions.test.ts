import {
  getEdexcelMathsSessionsForUnit,
  listEdexcelMathsUnitsWithSessions,
} from '@/lib/edexcel/maths-paper-sessions'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const wma = getEdexcelMathsSessionsForUnit('WMA11')
check('WMA11 has sessions', wma.length >= 8)
check('newest first', wma[0]?.label === 'January 2025' || wma[0]?.year === 2025)
check('includes June 2024', wma.some((s) => s.label === 'June 2024'))
check('physics empty', getEdexcelMathsSessionsForUnit('WPH11').length === 0)
check('units include WST02', listEdexcelMathsUnitsWithSessions().includes('WST02'))

if (failed > 0) process.exit(1)
console.log(`maths-paper-sessions.test.ts: all checks passed (${wma.length} sessions)`)

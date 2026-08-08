import { resolveMarkRunExamSystem } from '@/lib/marking/resolve-exam-system'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('explicit edexcel', resolveMarkRunExamSystem({ explicit: 'edexcel' }) === 'edexcel')
check(
  'explicit mixed case',
  resolveMarkRunExamSystem({ explicit: 'Edexcel' }) === 'edexcel'
)
check(
  'explicit Cambridge lowercases',
  resolveMarkRunExamSystem({ explicit: 'Cambridge' }) === 'cambridge'
)
check('from WMA11', resolveMarkRunExamSystem({ subjectCode: 'WMA11' }) === 'edexcel')
check('from 9709', resolveMarkRunExamSystem({ subjectCode: '9709' }) === 'cambridge')
check('from biology-hl', resolveMarkRunExamSystem({ subjectCode: 'biology-hl' }) === 'ib')
check(
  'explicit wins over subject',
  resolveMarkRunExamSystem({ explicit: 'ib', subjectCode: '9709' }) === 'ib'
)
check('null when empty', resolveMarkRunExamSystem({}) === null)
check('rejects unknown explicit', resolveMarkRunExamSystem({ explicit: 'ocr' }) === null)

if (failed > 0) process.exit(1)
console.log('resolve-exam-system.test.ts: all checks passed')

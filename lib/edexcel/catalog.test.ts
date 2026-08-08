import {
  findEdexcelSubjectByUnitCode,
  getEdexcelSubjects,
  getEdexcelUnitCodes,
  isEdexcelUnitCode,
} from '@/lib/edexcel/catalog'
import {
  edexcelSubjectPath,
  edexcelUnitPath,
  getAllEdexcelQualificationParams,
  getAllEdexcelSubjectParams,
} from '@/lib/seo/edexcel-graph'
import { resolveBoard } from '@/lib/courses/board'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const subjects = getEdexcelSubjects('international-a-level')
check('four IAL shell subjects', subjects.length === 4)
check(
  'wave-1 STEM first',
  subjects.filter((s) => s.markingWave === 1).map((s) => s.slug).join(',') ===
    'mathematics,physics,chemistry'
)
check('biology is wave 1.5', subjects.find((s) => s.slug === 'biology')?.markingWave === 1.5)

const codes = getEdexcelUnitCodes()
check('unit codes present', codes.includes('WMA11') && codes.includes('WBI16'))
check('isEdexcelUnitCode WMA11', isEdexcelUnitCode('wma11'))
check('find by unit', findEdexcelSubjectByUnitCode('WPH14')?.slug === 'physics')

check(
  'subject path',
  edexcelSubjectPath('international-a-level', 'mathematics') ===
    '/edexcel/international-a-level/mathematics'
)
check(
  'unit path lowercases code',
  edexcelUnitPath('international-a-level', 'mathematics', 'WMA11') ===
    '/edexcel/international-a-level/mathematics/wma11'
)

check('qual params include IGCSE shell', getAllEdexcelQualificationParams().length === 2)
check('subject params = 4', getAllEdexcelSubjectParams().length === 4)

check('resolveBoard(WMA11) is edexcel', resolveBoard('WMA11') === 'edexcel')
check('resolveBoard(9709) still cambridge', resolveBoard('9709') === 'cambridge')

if (failed > 0) process.exit(1)
console.log(`edexcel/catalog.test.ts: all checks passed (${codes.length} unit codes)`)

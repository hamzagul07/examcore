import { resolveBoard } from '@/lib/courses/board'
import {
  getOxfordaqaSubjects,
  isOxfordaqaContentCode,
} from '@/lib/oxfordaqa/catalog'
import {
  getAllOxfordaqaQualificationParams,
  getAllOxfordaqaSubjectParams,
  oxfordaqaSubjectPath,
} from '@/lib/seo/oxfordaqa-graph'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const subjects = getOxfordaqaSubjects('international-a-level')
check('four IAL shell subjects', subjects.length === 4)
check('owns oxaqa-mathematics', isOxfordaqaContentCode('oxaqa-mathematics'))
check(
  'resolveBoard oxaqa-mathematics',
  resolveBoard('oxaqa-mathematics') === 'oxfordaqa'
)
check(
  'subject path',
  oxfordaqaSubjectPath('international-a-level', 'mathematics') ===
    '/oxfordaqa/international-a-level/mathematics'
)
check('qual params include IGCSE', getAllOxfordaqaQualificationParams().length === 2)
check('subject params = 4', getAllOxfordaqaSubjectParams().length === 4)
check('9709 still cambridge', resolveBoard('9709') === 'cambridge')
check('WMA11 still edexcel', resolveBoard('WMA11') === 'edexcel')

if (failed > 0) process.exit(1)
console.log('oxfordaqa/catalog.test.ts: all checks passed')

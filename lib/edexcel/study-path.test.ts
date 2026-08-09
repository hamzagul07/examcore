import {
  edexcelStudyLessonHref,
  edexcelStudyMarkHref,
  edexcelStudyReturnPath,
  edexcelStudyUnitHubHref,
  parseEdexcelStudyUnit,
} from '@/lib/edexcel/study-path'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check(
  'tags lesson href + visual jump',
  edexcelStudyLessonHref('/courses/9709/1-1-quadratics', 'wma11') ===
    '/courses/9709/1-1-quadratics?board=edexcel&unit=WMA11#visual'
)
check(
  'can omit visual jump',
  edexcelStudyLessonHref('/courses/9709/1-1-quadratics', 'wma11', {
    jumpToVisual: false,
  }) === '/courses/9709/1-1-quadratics?board=edexcel&unit=WMA11'
)
check('parses unit', parseEdexcelStudyUnit({ board: 'edexcel', unit: 'WMA11' }) === 'WMA11')
check('rejects cambridge', parseEdexcelStudyUnit({ board: 'cambridge', unit: 'WMA11' }) === null)
check('rejects junk unit', parseEdexcelStudyUnit({ board: 'edexcel', unit: 'NOPE' }) === null)
const mark = edexcelStudyMarkHref('WMA11', '/courses/9709/1-1-quadratics', '1.1')
check('mark has board', mark.includes('board=edexcel') && mark.includes('subject=WMA11'))
check('mark has return', mark.includes('return='))
check(
  'return keeps unit context',
  decodeURIComponent(mark).includes(
    'return=/courses/9709/1-1-quadratics?board=edexcel&unit=WMA11'
  ) ||
    mark.includes(
      'return=%2Fcourses%2F9709%2F1-1-quadratics%3Fboard%3Dedexcel%26unit%3DWMA11'
    )
)
check(
  'return path helper',
  edexcelStudyReturnPath('/courses/9709/1-1-quadratics', 'WMA11') ===
    '/courses/9709/1-1-quadratics?board=edexcel&unit=WMA11'
)
check(
  'unit hub',
  edexcelStudyUnitHubHref('WMA11') ===
    '/edexcel/international-a-level/mathematics/wma11'
)

if (failed > 0) process.exit(1)
console.log('study-path.test.ts: all checks passed')

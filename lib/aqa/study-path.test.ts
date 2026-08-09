import {
  aqaStudyLabel,
  aqaStudyLessonHref,
  aqaStudyMarkHref,
  aqaStudyReturnPath,
  aqaStudySubjectHubHref,
  parseAqaStudySubject,
} from '@/lib/aqa/study-path'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check(
  'tags lesson href + visual jump',
  aqaStudyLessonHref('/courses/9709/1-1-quadratics', 'aqa-mathematics') ===
    '/courses/9709/1-1-quadratics?board=aqa&subject=aqa-mathematics#visual'
)
check(
  'can omit visual jump',
  aqaStudyLessonHref('/courses/9709/1-1-quadratics', 'aqa-mathematics', {
    jumpToVisual: false,
  }) === '/courses/9709/1-1-quadratics?board=aqa&subject=aqa-mathematics'
)
check(
  'parses subject',
  parseAqaStudySubject({ board: 'aqa', subject: 'aqa-mathematics' }) === 'aqa-mathematics'
)
check(
  'rejects edexcel board',
  parseAqaStudySubject({ board: 'edexcel', subject: 'aqa-mathematics' }) === null
)
check(
  'rejects junk subject',
  parseAqaStudySubject({ board: 'aqa', subject: 'nope' }) === null
)

const mark = aqaStudyMarkHref('aqa-mathematics', '/courses/9709/1-1-quadratics', '1.1')
check(
  'mark has board',
  mark.includes('board=aqa') && mark.includes('subject=aqa-mathematics')
)
check('mark has return', mark.includes('return='))
check(
  'mark has study_path utm',
  mark.includes('utm_source=study_path') && mark.includes('utm_campaign=aqa')
)
check(
  'return keeps subject context',
  mark.includes(
    'return=%2Fcourses%2F9709%2F1-1-quadratics%3Fboard%3Daqa%26subject%3Daqa-mathematics'
  )
)
check(
  'return path helper',
  aqaStudyReturnPath('/courses/9709/1-1-quadratics', 'aqa-mathematics') ===
    '/courses/9709/1-1-quadratics?board=aqa&subject=aqa-mathematics'
)
check(
  'subject hub',
  aqaStudySubjectHubHref('aqa-mathematics') === '/aqa/a-level/mathematics'
)
check('label', aqaStudyLabel('aqa-mathematics').includes('Mathematics'))

if (failed > 0) process.exit(1)
console.log('aqa/study-path.test.ts: all checks passed')

import {
  oxfordaqaStudyLabel,
  oxfordaqaStudyLessonHref,
  oxfordaqaStudyMarkHref,
  oxfordaqaStudyReturnPath,
  oxfordaqaStudySubjectHubHref,
  parseOxfordaqaStudySubject,
} from '@/lib/oxfordaqa/study-path'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check(
  'tags lesson href + visual jump',
  oxfordaqaStudyLessonHref('/courses/9709/1-1-quadratics', 'oxaqa-mathematics') ===
    '/courses/9709/1-1-quadratics?board=oxfordaqa&subject=oxaqa-mathematics#visual'
)
check(
  'can omit visual jump',
  oxfordaqaStudyLessonHref('/courses/9709/1-1-quadratics', 'oxaqa-mathematics', {
    jumpToVisual: false,
  }) === '/courses/9709/1-1-quadratics?board=oxfordaqa&subject=oxaqa-mathematics'
)
check(
  'parses subject',
  parseOxfordaqaStudySubject({ board: 'oxfordaqa', subject: 'oxaqa-mathematics' }) ===
    'oxaqa-mathematics'
)
check(
  'rejects edexcel board',
  parseOxfordaqaStudySubject({ board: 'edexcel', subject: 'oxaqa-mathematics' }) === null
)
check(
  'rejects junk subject',
  parseOxfordaqaStudySubject({ board: 'oxfordaqa', subject: 'nope' }) === null
)

const mark = oxfordaqaStudyMarkHref(
  'oxaqa-mathematics',
  '/courses/9709/1-1-quadratics',
  '1.1'
)
check(
  'mark has board',
  mark.includes('board=oxfordaqa') && mark.includes('subject=oxaqa-mathematics')
)
check('mark has return', mark.includes('return='))
check(
  'mark has study_path utm',
  mark.includes('utm_source=study_path') && mark.includes('utm_campaign=oxfordaqa')
)
check(
  'return keeps subject context',
  mark.includes(
    'return=%2Fcourses%2F9709%2F1-1-quadratics%3Fboard%3Doxfordaqa%26subject%3Doxaqa-mathematics'
  )
)
check(
  'return path helper',
  oxfordaqaStudyReturnPath('/courses/9709/1-1-quadratics', 'oxaqa-mathematics') ===
    '/courses/9709/1-1-quadratics?board=oxfordaqa&subject=oxaqa-mathematics'
)
check(
  'subject hub',
  oxfordaqaStudySubjectHubHref('oxaqa-mathematics') ===
    '/oxfordaqa/international-a-level/mathematics'
)
check('label', oxfordaqaStudyLabel('oxaqa-mathematics').includes('Mathematics'))

if (failed > 0) process.exit(1)
console.log('oxfordaqa/study-path.test.ts: all checks passed')

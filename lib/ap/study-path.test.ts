import {
  apStudyLabel,
  apStudyLessonHref,
  apStudyMarkHref,
  apStudyReturnPath,
  apStudySubjectHubHref,
  parseApStudySubject,
} from '@/lib/ap/study-path'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check(
  'tags lesson href + visual jump',
  apStudyLessonHref('/courses/9709/1-7-differentiation', 'ap-calculus-ab') ===
    '/courses/9709/1-7-differentiation?board=ap&subject=ap-calculus-ab#visual'
)
check(
  'can omit visual jump',
  apStudyLessonHref('/courses/9709/1-7-differentiation', 'ap-calculus-ab', {
    jumpToVisual: false,
  }) === '/courses/9709/1-7-differentiation?board=ap&subject=ap-calculus-ab'
)
check(
  'parses subject',
  parseApStudySubject({ board: 'ap', subject: 'ap-calculus-ab' }) === 'ap-calculus-ab'
)
check(
  'rejects aqa board',
  parseApStudySubject({ board: 'aqa', subject: 'ap-calculus-ab' }) === null
)
check(
  'rejects junk subject',
  parseApStudySubject({ board: 'ap', subject: 'nope' }) === null
)

const mark = apStudyMarkHref(
  'ap-calculus-ab',
  '/courses/9709/1-7-differentiation',
  '1.7'
)
check(
  'mark has board',
  mark.includes('board=ap') && mark.includes('subject=ap-calculus-ab')
)
check('mark has return', mark.includes('return='))
check(
  'mark has study_path utm',
  mark.includes('utm_source=study_path') && mark.includes('utm_campaign=ap')
)
check(
  'return keeps subject context',
  mark.includes(
    'return=%2Fcourses%2F9709%2F1-7-differentiation%3Fboard%3Dap%26subject%3Dap-calculus-ab'
  )
)
check(
  'return path helper',
  apStudyReturnPath('/courses/9709/1-7-differentiation', 'ap-calculus-ab') ===
    '/courses/9709/1-7-differentiation?board=ap&subject=ap-calculus-ab'
)
check(
  'course hub',
  apStudySubjectHubHref('ap-calculus-ab') === '/ap/calculus-ab'
)
check('label', apStudyLabel('ap-calculus-ab').includes('Calculus'))

if (failed > 0) process.exit(1)
console.log('ap/study-path.test.ts: all checks passed')

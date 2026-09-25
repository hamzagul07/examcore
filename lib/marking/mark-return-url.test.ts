import { parseMarkReturnPath } from '@/lib/marking/mark-return-url'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('bare lesson', parseMarkReturnPath('/courses/9709/1-1-quadratics') === '/courses/9709/1-1-quadratics')
check(
  'keeps board/unit query',
  parseMarkReturnPath('/courses/9709/1-1-quadratics?board=edexcel&unit=WMA11') ===
    '/courses/9709/1-1-quadratics?board=edexcel&unit=WMA11'
)
check(
  'strips hash',
  parseMarkReturnPath('/courses/9709/1-1-quadratics?board=edexcel&unit=WMA11#visual') ===
    '/courses/9709/1-1-quadratics?board=edexcel&unit=WMA11'
)
check('allows vault desk', parseMarkReturnPath('/dashboard/vault') === '/dashboard/vault')
check('allows the study plan', parseMarkReturnPath('/dashboard/plan') === '/dashboard/plan')
check(
  'allows progress desk',
  parseMarkReturnPath('/dashboard/progress?tab=insights') ===
    '/dashboard/progress?tab=insights'
)
check(
  'allows a teacher set',
  parseMarkReturnPath('/dashboard/assignments/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c') ===
    '/dashboard/assignments/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c'
)
check('allows the set list', parseMarkReturnPath('/dashboard/assignments') === '/dashboard/assignments')
check('rejects a look-alike desk', parseMarkReturnPath('/dashboard/assignmentsx') === null)
check(
  'rejects traversal out of the sets',
  parseMarkReturnPath('/dashboard/assignments/../../teacher/dashboard') === null
)
check('rejects external', parseMarkReturnPath('https://evil.com/courses/x') === null)
check('rejects protocol-relative', parseMarkReturnPath('//evil.com/courses/x') === null)
check('rejects non-courses', parseMarkReturnPath('/mark?board=edexcel') === null)
check('null', parseMarkReturnPath(null) === null)

if (failed > 0) process.exit(1)
console.log('mark-return-url.test.ts: all checks passed')

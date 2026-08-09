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
check('rejects external', parseMarkReturnPath('https://evil.com/courses/x') === null)
check('rejects protocol-relative', parseMarkReturnPath('//evil.com/courses/x') === null)
check('rejects non-courses', parseMarkReturnPath('/mark?board=edexcel') === null)
check('null', parseMarkReturnPath(null) === null)

if (failed > 0) process.exit(1)
console.log('mark-return-url.test.ts: all checks passed')

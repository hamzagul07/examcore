import { verifiedCourseLessonsForEdexcelUnit } from '@/lib/curriculum-graph/verified-course-links'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const wma11 = verifiedCourseLessonsForEdexcelUnit('WMA11')
check('WMA11 has mapped course lessons', wma11.length >= 8)
check(
  'WMA11 hrefs are /courses/9709/',
  wma11.every((l) => l.href.startsWith('/courses/9709/'))
)
check(
  'WMA11 includes quadratics topic',
  wma11.some((l) => l.topicCode === '1.1')
)
check(
  'WMA11 titles present',
  wma11.every((l) => l.title.trim().length > 0)
)
check(
  'WMA11 lessons expose live diagrams',
  wma11.every((l) => l.hasLiveDiagram && l.diagramStepCount >= 4)
)
check(
  'WMA11 differentiation/integration have params',
  wma11.some((l) => l.topicCode === '1.7' && l.hasDiagramParams) &&
    wma11.some((l) => l.topicCode === '1.8' && l.hasDiagramParams)
)

const wme02 = verifiedCourseLessonsForEdexcelUnit('WME02')
check('WME02 has verified course lessons', wme02.length >= 1)

const empty = verifiedCourseLessonsForEdexcelUnit('WXX99')
check('unknown unit empty', empty.length === 0)

if (failed > 0) process.exit(1)
console.log(
  `verified-course-links.test.ts: all checks passed (WMA11=${wma11.length} lessons)`
)

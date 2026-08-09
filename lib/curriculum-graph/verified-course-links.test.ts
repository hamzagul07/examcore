import {
  verifiedCourseLessonsForApSubject,
  verifiedCourseLessonsForAqaSubject,
  verifiedCourseLessonsForEdexcelUnit,
  verifiedCourseLessonsForOxfordaqaSubject,
} from '@/lib/curriculum-graph/verified-course-links'

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

const oxMaths = verifiedCourseLessonsForOxfordaqaSubject('oxaqa-mathematics')
check('OxfordAQA maths has mapped course lessons', oxMaths.length >= 8)
check(
  'OxfordAQA maths hrefs are /courses/9709/',
  oxMaths.every((l) => l.href.startsWith('/courses/9709/'))
)
const oxBio = verifiedCourseLessonsForOxfordaqaSubject('oxaqa-biology')
check('OxfordAQA biology has mapped course lessons', oxBio.length >= 1)
check(
  'OxfordAQA biology hrefs are /courses/9700/',
  oxBio.every((l) => l.href.startsWith('/courses/9700/'))
)

const aqaMaths = verifiedCourseLessonsForAqaSubject('aqa-mathematics')
check('AQA maths has mapped course lessons', aqaMaths.length >= 8)
check(
  'AQA maths hrefs are /courses/9709/',
  aqaMaths.every((l) => l.href.startsWith('/courses/9709/'))
)
const aqaPhys = verifiedCourseLessonsForAqaSubject('aqa-physics')
check('AQA physics has mapped course lessons', aqaPhys.length >= 1)
check(
  'AQA physics hrefs are /courses/9702/',
  aqaPhys.every((l) => l.href.startsWith('/courses/9702/'))
)

const apCalc = verifiedCourseLessonsForApSubject('ap-calculus-ab')
check('AP Calculus AB has mapped course lessons', apCalc.length >= 6)
check(
  'AP Calculus AB hrefs are /courses/9709/',
  apCalc.every((l) => l.href.startsWith('/courses/9709/'))
)
const apPhys = verifiedCourseLessonsForApSubject('ap-physics-1')
check('AP Physics 1 has mapped course lessons', apPhys.length >= 1)
check(
  'AP Physics 1 hrefs are /courses/9702/',
  apPhys.every((l) => l.href.startsWith('/courses/9702/'))
)

if (failed > 0) process.exit(1)
console.log(
  `verified-course-links.test.ts: all checks passed (WMA11=${wma11.length} oxMaths=${oxMaths.length} aqaMaths=${aqaMaths.length} apCalc=${apCalc.length})`
)

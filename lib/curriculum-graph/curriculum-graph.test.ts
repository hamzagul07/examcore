import { CAMBRIDGE_9709_SYLLABUS } from '@/lib/syllabus'
import {
  edexcelPathForUnit,
  edexcelQualificationForUnit,
  edexcelUnitsWithCourseLinks,
  expectedCaie9709TopicCodes,
  getMappingsForApSubject,
  getMappingsForAqaSubject,
  getMappingsForCaieTopic,
  getMappingsForEdexcelUnit,
  listOverlapForSubject,
  listedCaie9709TopicCodes,
  resolveCaieLinksForEdexcelUnit,
  resolveCourseLinksForEdexcelUnit,
  resolveEdexcelLinksForCaieTopic,
} from '@/lib/curriculum-graph'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const listed = listedCaie9709TopicCodes()
const expected = expectedCaie9709TopicCodes()
check('seed covers all 9709 topic codes', listed.length === expected.length)
for (const code of expected) {
  check(`9709 ${code} mapped`, listed.includes(code))
}

const q = getMappingsForCaieTopic('9709', '1.1')
check('quadratics maps', q.length >= 1)
check(
  'quadratics → WMA11',
  q.some((c) => c.refs.some((r) => r.board === 'edexcel' && r.syllabusOrUnit === 'WMA11'))
)

const wma11 = getMappingsForEdexcelUnit('wma11')
check('WMA11 has topic mappings', wma11.filter((c) => c.refs.some((r) => r.topicCode)).length >= 8)

const edLinks = resolveEdexcelLinksForCaieTopic('9709', '1.1')
check('resolve Edexcel href for 1.1', edLinks.some((l) => l.href.includes('/wma11')))
check(
  'IAL unit path',
  edexcelPathForUnit('WMA11') === '/edexcel/international-a-level/mathematics/wma11'
)
check('UK unit qual', edexcelQualificationForUnit('9MA0') === 'a-level')
check(
  'UK unit path',
  edexcelPathForUnit('9MA0') === '/edexcel/a-level/mathematics/9ma0'
)

const caieLinks = resolveCaieLinksForEdexcelUnit('WME01')
check('WME01 → CAIE mechanics topics', caieLinks.some((l) => l.topicCode?.startsWith('4.')))
const wme02 = resolveCourseLinksForEdexcelUnit('WME02')
check('WME02 course links', wme02.some((l) => l.href.startsWith('/courses/9709/')))
check(
  'WME02 CAIE links',
  resolveCaieLinksForEdexcelUnit('WME02').some((l) => l.topicCode?.startsWith('4.'))
)

const courseLinks = resolveCourseLinksForEdexcelUnit('WMA11')
check('WMA11 course links', courseLinks.length >= 1)
check(
  'WMA11 course href shape',
  courseLinks.every((l) => l.href.startsWith('/courses/9709/'))
)

const wph = getMappingsForEdexcelUnit('WPH11')
check('WPH11 mapped', wph.length >= 1)
const wphCourses = resolveCourseLinksForEdexcelUnit('WPH11')
check('WPH11 course links', wphCourses.some((l) => l.href.startsWith('/courses/9702/')))

const wch = resolveCourseLinksForEdexcelUnit('WCH11')
check('WCH11 course links', wch.some((l) => l.href.startsWith('/courses/9701/')))

const wbi = resolveCourseLinksForEdexcelUnit('WBI11')
check('WBI11 course links', wbi.some((l) => l.href.startsWith('/courses/9700/')))

const units = edexcelUnitsWithCourseLinks()
for (const u of units) {
  check(`${u} has ≥1 course link`, resolveCourseLinksForEdexcelUnit(u).length >= 1)
}

const overlap = listOverlapForSubject('9709')
check('overlap lists WMA11', overlap.some((o) => o.unitCode === 'WMA11' && o.topicCount >= 8))
check('overlap lists WST02', overlap.some((o) => o.unitCode === 'WST02'))

for (const code of CAMBRIDGE_9709_SYLLABUS.map((t) => t.code)) {
  const maps = getMappingsForCaieTopic('9709', code)
  check(
    `${code} has edexcel counterpart`,
    maps.some((c) => c.refs.some((r) => r.board === 'edexcel'))
  )
}

const aqaMaths = getMappingsForAqaSubject('aqa-mathematics')
check('AQA maths has topic mappings', aqaMaths.length >= 8)
check(
  'AQA maths resolves hub href',
  resolveEdexcelLinksForCaieTopic('9709', '1.1').some((l) =>
    l.href.includes('/aqa/a-level/mathematics')
  )
)

const apCalc = getMappingsForApSubject('ap-calculus-ab')
check('AP Calculus AB has topic mappings', apCalc.length >= 6)
check(
  'AP Calculus AB resolves hub href',
  resolveEdexcelLinksForCaieTopic('9709', '1.7').some((l) =>
    l.href.includes('/ap/calculus-ab')
  )
)

if (failed > 0) process.exit(1)
console.log(
  `curriculum-graph.test.ts: all checks passed (${listed.length} 9709 topics, ${overlap.length} IAL maths units, ${units.length} units with courses)`
)

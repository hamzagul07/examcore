import { CAMBRIDGE_9709_SYLLABUS } from '@/lib/syllabus'
import {
  expectedCaie9709TopicCodes,
  getMappingsForCaieTopic,
  getMappingsForEdexcelUnit,
  listOverlapForSubject,
  listedCaie9709TopicCodes,
  resolveCaieLinksForEdexcelUnit,
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

const caieLinks = resolveCaieLinksForEdexcelUnit('WME01')
check('WME01 → CAIE mechanics topics', caieLinks.some((l) => l.topicCode?.startsWith('4.')))

const overlap = listOverlapForSubject('9709')
check('overlap lists WMA11', overlap.some((o) => o.unitCode === 'WMA11' && o.topicCount >= 8))
check('overlap lists WST02', overlap.some((o) => o.unitCode === 'WST02'))

// No claimed mapping without a counterpart board
for (const code of CAMBRIDGE_9709_SYLLABUS.map((t) => t.code)) {
  const maps = getMappingsForCaieTopic('9709', code)
  check(
    `${code} has edexcel counterpart`,
    maps.some((c) => c.refs.some((r) => r.board === 'edexcel'))
  )
}

if (failed > 0) process.exit(1)
console.log(
  `curriculum-graph.test.ts: all checks passed (${listed.length} 9709 topics, ${overlap.length} IAL units)`
)

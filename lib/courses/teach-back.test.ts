import {
  buildTeachBackPrompt,
  clampTeachBackExplanation,
  isPlausibleTeachBackResult,
  lessonBriefFromParts,
  parseTeachBackResponse,
  salvageTeachBackResponse,
} from './teach-back'

let failed = 0
function check(label: string, ok: boolean) {
  if (!ok) {
    console.error('FAIL:', label)
    failed += 1
  }
}

check('clamp trims', clampTeachBackExplanation('  hi  ') === 'hi')
check(
  'clamp caps length',
  clampTeachBackExplanation('x'.repeat(3000)).length === 2400
)

const brief = lessonBriefFromParts({
  title: 'Forces',
  summary: 'Net force changes motion.',
  steps: ['Define F=ma', 'Resolve components'],
  takeaways: ['Unbalanced force accelerates'],
})
check('brief has title', brief.includes('Forces'))
check('brief has step', brief.includes('F=ma'))

const { system, user } = buildTeachBackPrompt({
  title: 'Forces',
  topicCode: '1.1',
  lessonBrief: brief,
  explanation: 'Force makes things move.',
})
check('system asks for JSON', system.includes('JSON'))
check('user includes student text', user.includes('Force makes things move'))

const ok = parseTeachBackResponse(
  '```json\n{"verdict":"thin","summary":"Missing the definition of net force.","gaps":[{"idea":"Net force","why":"Marks need F_net = ma, not vibes."}]}\n```'
)
check('parses fenced JSON', !!ok && ok.verdict === 'thin')
check('parses gap', !!ok && ok.gaps[0]?.idea === 'Net force')

check('rejects junk', parseTeachBackResponse('nope') === null)
check(
  'rejects bad verdict',
  parseTeachBackResponse('{"verdict":"great","summary":"x","gaps":[]}') === null
)

const trailed = parseTeachBackResponse(
  '{"verdict":"Partial","summary":"Missed components.","gaps":[{"idea":"Resolve","why":"Marks need Fx and Fy.",}],}'
)
check('tolerates trailing commas + case', !!trailed && trailed.verdict === 'partial')

const curly = parseTeachBackResponse(
  '{"verdict":"thin","summary":“Too vague.”,"gaps":[]}'
)
check('tolerates smart quotes', !!curly && curly.verdict === 'thin')

const real = parseTeachBackResponse(
  '{"verdict":"partial","summary":"Missed vector direction.","gaps":[{"idea":"Direction","why":"Vectors need magnitude and direction."}]}'
)
check('plausible real result', !!real && isPlausibleTeachBackResult(real))
const meta = parseTeachBackResponse(
  '{"verdict":"thin","summary":"The JSON was incomplete.","gaps":[{"idea":"Missing gaps array","why":"The gaps array was absent from the output."}]}'
)
check('rejects meta JSON commentary', !!meta && !isPlausibleTeachBackResult(meta))

const truncated = salvageTeachBackResponse(
  '{\n  "verdict": "partial",\n  "summary": "The student correctly identified base/derived'
)
check(
  'salvages truncated JSON',
  !!truncated && truncated.verdict === 'partial' && truncated.summary.length >= 12
)

if (failed > 0) process.exit(1)
console.log('teach-back.test.ts: all checks passed')
